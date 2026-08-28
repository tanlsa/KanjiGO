import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 3 else {
  fputs("Usage: repair-merged-v4-sprites.swift PLAYER.png FEMALE.png\n", stderr)
  exit(2)
}

let size = 512, cell = 128, bytesPerPixel = 4, bytesPerRow = size * bytesPerPixel
let colorSpace = CGColorSpaceCreateDeviceRGB()

func editPNG(at path: String, edit: (inout [UInt8]) -> Void) {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
        image.width == size, image.height == size else {
    fputs("Expected a 512x512 spritesheet: \(path)\n", stderr); exit(1)
  }
  var pixels = [UInt8](repeating: 0, count: size * bytesPerRow)
  guard let decode = CGContext(data: &pixels, width: size, height: size, bitsPerComponent: 8,
    bytesPerRow: bytesPerRow, space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
  decode.interpolationQuality = .none
  decode.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
  edit(&pixels)
  guard let encode = CGContext(data: &pixels, width: size, height: size, bitsPerComponent: 8,
    bytesPerRow: bytesPerRow, space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
    let output = encode.makeImage(),
    let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
  else { exit(1) }
  CGImageDestinationAddImage(destination, output, nil)
  guard CGImageDestinationFinalize(destination) else { exit(1) }
}

func offset(_ x: Int, _ y: Int) -> Int { (y * size + x) * bytesPerPixel }

// The merged male sheet had two crown pixels inside the eight-pixel safe
// gutter. Move every pose together so animation baselines stay coherent.
editPNG(at: CommandLine.arguments[1]) { pixels in
  let snapshot = pixels
  let needsShift = (0..<4).contains { row in (0..<4).contains { frame in
    (0..<8).contains { localY in (0..<cell).contains { localX in
      snapshot[offset(frame * cell + localX, row * cell + localY) + 3] > 20
    }}
  }}
  if needsShift {
    for row in 0..<4 { for frame in 0..<4 {
      let originX = frame * cell, originY = row * cell
      for localY in 0..<cell { for localX in 0..<cell {
        let target = offset(originX + localX, originY + localY)
        pixels[target] = 0; pixels[target + 1] = 0; pixels[target + 2] = 0; pixels[target + 3] = 0
      }}
      for localY in 0..<(cell - 2) { for localX in 0..<cell {
        let source = offset(originX + localX, originY + localY)
        let target = offset(originX + localX, originY + localY + 2)
        pixels[target] = snapshot[source]; pixels[target + 1] = snapshot[source + 1]
        pixels[target + 2] = snapshot[source + 2]; pixels[target + 3] = snapshot[source + 3]
      }}
    }}
  }
  let locked = pixels, originY = cell * 3
  for frame in 1..<4 { for localY in 0...59 { for localX in 0..<cell {
    let source = offset(localX, originY + localY), target = offset(frame * cell + localX, originY + localY)
    pixels[target] = locked[source]; pixels[target + 1] = locked[source + 1]
    pixels[target + 2] = locked[source + 2]; pixels[target + 3] = locked[source + 3]
  }}}
  func verticalBounds(row: Int, frame: Int) -> (min: Int, max: Int) {
    var minimum = cell, maximum = -1
    for localY in 0..<cell { for localX in 0..<cell {
      if pixels[offset(frame * cell + localX, row * cell + localY) + 3] > 20 {
        minimum = min(minimum, localY); maximum = max(maximum, localY)
      }
    }}
    return (minimum, maximum)
  }
  let reference = verticalBounds(row: 0, frame: 0)
  let targetHeight = reference.max - reference.min + 1
  let beforeCompression = pixels
  for frame in 0..<4 {
    let bounds = verticalBounds(row: 3, frame: frame)
    let sourceHeight = bounds.max - bounds.min + 1
    guard sourceHeight > targetHeight else { continue }
    let originX = frame * cell, originY = cell * 3
    for localY in 0..<cell { for localX in 0..<cell {
      let target = offset(originX + localX, originY + localY)
      pixels[target] = 0; pixels[target + 1] = 0; pixels[target + 2] = 0; pixels[target + 3] = 0
    }}
    let destinationMin = bounds.max - targetHeight + 1
    for destinationY in destinationMin...bounds.max { for localX in 0..<cell {
      let relativeY = destinationY - destinationMin
      let sourceY = bounds.min + min(sourceHeight - 1, Int(Double(relativeY) * Double(sourceHeight) / Double(targetHeight)))
      let source = offset(originX + localX, originY + sourceY)
      let target = offset(originX + localX, originY + destinationY)
      pixels[target] = beforeCompression[source]; pixels[target + 1] = beforeCompression[source + 1]
      pixels[target + 2] = beforeCompression[source + 2]; pixels[target + 3] = beforeCompression[source + 3]
    }}
  }
}

// Crown rounding happened after the normalizer's head-lock pass. Reapply the
// approved contact-frame head to the remaining up-facing animation frames.
editPNG(at: CommandLine.arguments[2]) { pixels in
  let snapshot = pixels, originY = cell * 3, headEnd = 59
  for frame in 1..<4 { for localY in 0...headEnd { for localX in 0..<cell {
    let source = offset(localX, originY + localY)
    let target = offset(frame * cell + localX, originY + localY)
    pixels[target] = snapshot[source]; pixels[target + 1] = snapshot[source + 1]
    pixels[target + 2] = snapshot[source + 2]; pixels[target + 3] = snapshot[source + 3]
  }}}
  // Keep the rounded crown while restoring the one missing source row needed
  // for a stable 128→32 silhouette height.
  var top = cell
  for localY in 0..<cell { for localX in 0..<cell {
    if pixels[offset(localX, originY + localY) + 3] > 20 { top = min(top, localY) }
  }}
  if top > 8 {
    var left = cell, right = -1
    for localX in 0..<cell where pixels[offset(localX, originY + top) + 3] > 20 {
      left = min(left, localX); right = max(right, localX)
    }
    if right >= left {
      let inset = max(1, (right - left + 1) / 8)
      for frame in 0..<4 { for localX in (left + inset)...(right - inset) {
        let source = offset(frame * cell + localX, originY + top)
        let target = offset(frame * cell + localX, originY + top - 1)
        pixels[target] = pixels[source]; pixels[target + 1] = pixels[source + 1]
        pixels[target + 2] = pixels[source + 2]; pixels[target + 3] = pixels[source + 3]
      }}
    }
  }
}

print("Repaired V4 safe padding and rear-head lock")
