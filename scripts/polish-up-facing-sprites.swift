import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count >= 3 else {
  fputs("Usage: polish-up-facing-sprites.swift BICYCLE.png CHARACTER.png...\n", stderr)
  exit(2)
}

let size = 512, cell = 128, bytesPerPixel = 4, bytesPerRow = size * bytesPerPixel
let colorSpace = CGColorSpaceCreateDeviceRGB()

func editPNG(at path: String, edit: (inout [UInt8]) -> Void) {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
        image.width == size, image.height == size else {
    fputs("Expected a 512x512 RGBA spritesheet: \(path)\n", stderr)
    exit(1)
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
        let destination = CGImageDestinationCreateWithURL(
          url as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(1) }
  CGImageDestinationAddImage(destination, output, nil)
  guard CGImageDestinationFinalize(destination) else { exit(1) }
}

func pixelOffset(x: Int, y: Int) -> Int { (y * size + x) * bytesPerPixel }

let bicyclePath = CommandLine.arguments[1]
editPNG(at: bicyclePath) { pixels in
  func clearNeutralComponent(frame: Int, row: Int, seedX: Int, seedY: Int) {
    func isNeutral(_ localX: Int, _ localY: Int) -> Bool {
      let offset = pixelOffset(x: frame * cell + localX, y: row * cell + localY)
      let red = Int(pixels[offset]), green = Int(pixels[offset + 1]), blue = Int(pixels[offset + 2])
      return pixels[offset + 3] > 0 && min(red, green, blue) >= 120
        && max(red, green, blue) - min(red, green, blue) <= 90
    }

    guard isNeutral(seedX, seedY) else { return }
    var seen = Set<Int>(), queue = [seedY * cell + seedX], cursor = 0
    seen.insert(queue[0])
    while cursor < queue.count {
      let point = queue[cursor]; cursor += 1
      let x = point % cell, y = point / cell
      for dy in -1...1 { for dx in -1...1 where dx != 0 || dy != 0 {
        let nextX = x + dx, nextY = y + dy
        guard nextX >= 0, nextY >= 0, nextX < cell, nextY < cell else { continue }
        let next = nextY * cell + nextX
        if !seen.contains(next) && isNeutral(nextX, nextY) {
          seen.insert(next); queue.append(next)
        }
      }}
    }
    for point in seen {
      let offset = pixelOffset(x: frame * cell + point % cell, y: row * cell + point / cell)
      pixels[offset] = 0; pixels[offset + 1] = 0; pixels[offset + 2] = 0; pixels[offset + 3] = 0
    }
  }

  // In the rear view the rider sits in front of the steering assembly. A wide
  // horizontal bar reads as a second handlebar across the rider's back, so the
  // overlay begins at the centered stem instead.
  for frame in 0..<4 {
    for localY in 26...35 {
      for localX in 36...91 {
        let offset = pixelOffset(x: frame * cell + localX, y: 3 * cell + localY)
        pixels[offset] = 0; pixels[offset + 1] = 0; pixels[offset + 2] = 0; pixels[offset + 3] = 0
      }
    }
  }

  // Generated side-view art retained two neutral-white panels inside the
  // orange frame triangles. Flood only those enclosed neutral regions; wheel
  // rims, spokes, handlebar metal, pedals and orange highlights stay intact.
  for frame in 0..<4 {
    clearNeutralComponent(frame: frame, row: 1, seedX: 64, seedY: 60)
    clearNeutralComponent(frame: frame, row: 1, seedX: 44, seedY: 69)
    clearNeutralComponent(frame: frame, row: 2, seedX: 63, seedY: 60)
    clearNeutralComponent(frame: frame, row: 2, seedX: 84, seedY: 69)
  }
}
print("\(bicyclePath): removed rear-view handlebar band and white frame remnants")

for characterPath in CommandLine.arguments.dropFirst(2) {
  editPNG(at: characterPath) { pixels in
    for frame in 0..<4 {
      let originX = frame * cell, originY = 3 * cell

      func copyHairPixel(fromX: Int, fromY: Int, toX: Int, toY: Int) {
        let source = pixelOffset(x: originX + fromX, y: originY + fromY)
        let target = pixelOffset(x: originX + toX, y: originY + toY)
        pixels[target] = pixels[source]
        pixels[target + 1] = pixels[source + 1]
        pixels[target + 2] = pixels[source + 2]
        pixels[target + 3] = pixels[source + 3]
      }

      // Three tapered, runtime-grid-aligned nape locks replace the visually
      // flat hair/shirt seam. Source pixels come from the existing hair so the
      // palette and highlights remain identical for every appearance.
      let locks = [
        (sourceX: 48, targetX: 52, width: 4),
        (sourceX: 60, targetX: 62, width: 4),
        (sourceX: 76, targetX: 72, width: 4),
      ]
      for lock in locks {
        for dy in 0..<8 {
          let inset = dy >= 4 ? 1 : 0
          for dx in inset..<(lock.width - inset) {
            copyHairPixel(fromX: lock.sourceX + min(dx, 3), fromY: 48 + min(dy, 7),
                          toX: lock.targetX + dx, toY: 56 + dy)
          }
        }
      }
    }
  }
  print("\(characterPath): tapered rear-view nape silhouette")
}
