import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count >= 4,
      let frameSize = Int(CommandLine.arguments[3]), frameSize >= 32 else {
  fputs("Usage: normalize-grid-spritesheet.swift INPUT.png OUTPUT.png FRAME_SIZE [--center-frames] [--mirror-right] [--remove-stray-components]\n", stderr)
  exit(2)
}
let mirrorRight = CommandLine.arguments.dropFirst(4).contains("--mirror-right")
let centerFrames = CommandLine.arguments.dropFirst(4).contains("--center-frames")
let removeStrayComponents = CommandLine.arguments.dropFirst(4).contains("--remove-stray-components")

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
      image.width == image.height else {
  fputs("Expected a square PNG spritesheet.\n", stderr)
  exit(1)
}

let width = image.width, height = image.height, bpp = 4, rowBytes = width * bpp
let colorSpace = CGColorSpaceCreateDeviceRGB()
var pixels = [UInt8](repeating: 0, count: height * rowBytes)
guard let decode = CGContext(data: &pixels, width: width, height: height,
                             bitsPerComponent: 8, bytesPerRow: rowBytes,
                             space: colorSpace,
                             bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
decode.interpolationQuality = .none
decode.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

// Image generators may return an opaque near-white checkerboard or black matte.
// Remove only neutral pixels connected to the outer edge so white bicycle parts,
// eyes and badges enclosed by outlines stay intact.
let corner = 0
let cornerLuma = (Int(pixels[corner]) + Int(pixels[corner + 1]) + Int(pixels[corner + 2])) / 3
func isBackground(_ pixel: Int) -> Bool {
  let i = pixel * bpp, r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
  let neutral = max(r, g, b) - min(r, g, b) <= 20
  return neutral && (cornerLuma >= 128 ? min(r, g, b) >= 205 : max(r, g, b) <= 32)
}
var visited = [Bool](repeating: false, count: width * height)
var queue: [Int] = []
func enqueue(_ x: Int, _ y: Int) {
  guard x >= 0, y >= 0, x < width, y < height else { return }
  let p = y * width + x
  if !visited[p] && isBackground(p) { visited[p] = true; queue.append(p) }
}
for x in 0..<width { enqueue(x, 0); enqueue(x, height - 1) }
for y in 0..<height { enqueue(0, y); enqueue(width - 1, y) }
var cursor = 0
while cursor < queue.count {
  let p = queue[cursor]; cursor += 1
  let x = p % width, y = p / width, i = p * bpp
  pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0
  enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1)
}

guard let cleanedContext = CGContext(data: &pixels, width: width, height: height,
                                     bitsPerComponent: 8, bytesPerRow: rowBytes,
                                     space: colorSpace,
                                     bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
      let cleaned = cleanedContext.makeImage() else { exit(1) }

let outputSize = frameSize * 4, outputRowBytes = outputSize * bpp
var output = [UInt8](repeating: 0, count: outputSize * outputRowBytes)
guard let canvas = CGContext(data: &output, width: outputSize, height: outputSize,
                             bitsPerComponent: 8, bytesPerRow: outputRowBytes,
                             space: colorSpace,
                             bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
canvas.interpolationQuality = .none
for row in 0..<4 { for column in 0..<4 {
  let x0 = column * width / 4, x1 = (column + 1) * width / 4
  let y0 = row * height / 4, y1 = (row + 1) * height / 4
  guard let cell = cleaned.cropping(to: CGRect(x: x0, y: y0, width: x1 - x0, height: y1 - y0)) else { continue }
  canvas.draw(cell, in: CGRect(x: column * frameSize, y: row * frameSize,
                              width: frameSize, height: frameSize))
}}

if removeStrayComponents {
  // Keep the largest 8-connected alpha component in every frame. Generated
  // sheets occasionally leak a duplicate hair tuft across a cell boundary;
  // the rider and bicycle are authored as one connected silhouette.
  for row in 0..<4 { for frame in 0..<4 {
    var visited = [Bool](repeating: false, count: frameSize * frameSize)
    var components: [[Int]] = []
    func isOpaque(_ localX: Int, _ localY: Int) -> Bool {
      let x = frame * frameSize + localX, y = row * frameSize + localY
      return output[(y * outputSize + x) * bpp + 3] > 20
    }
    for startY in 0..<frameSize { for startX in 0..<frameSize {
      let start = startY * frameSize + startX
      if visited[start] || !isOpaque(startX, startY) { continue }
      visited[start] = true
      var component = [start], cursor = 0
      while cursor < component.count {
        let point = component[cursor]; cursor += 1
        let x = point % frameSize, y = point / frameSize
        for dy in -1...1 { for dx in -1...1 where dx != 0 || dy != 0 {
          let nextX = x + dx, nextY = y + dy
          guard nextX >= 0, nextY >= 0, nextX < frameSize, nextY < frameSize else { continue }
          let next = nextY * frameSize + nextX
          if !visited[next] && isOpaque(nextX, nextY) {
            visited[next] = true; component.append(next)
          }
        }}
      }
      components.append(component)
    }}
    guard let largest = components.indices.max(by: { components[$0].count < components[$1].count }) else { continue }
    for index in components.indices where index != largest {
      for point in components[index] {
        let localX = point % frameSize, localY = point / frameSize
        let offset = ((row * frameSize + localY) * outputSize + frame * frameSize + localX) * bpp
        for channel in 0..<bpp { output[offset + channel] = 0 }
      }
    }
  }}
}

if centerFrames {
  // Generated cells often place a coherent object a few source pixels left or
  // right between animation phases. Lock the silhouette center and tire
  // contact baseline so only the wheel/pedal details animate at runtime.
  struct AlphaBounds {
    var minX = Int.max, minY = Int.max, maxX = Int.min, maxY = Int.min
    var isEmpty: Bool { maxX < minX || maxY < minY }
  }
  func bounds(row: Int, frame: Int, pixels: [UInt8]) -> AlphaBounds {
    var result = AlphaBounds()
    for localY in 0..<frameSize { for localX in 0..<frameSize {
      let x = frame * frameSize + localX, y = row * frameSize + localY
      if pixels[(y * outputSize + x) * bpp + 3] <= 20 { continue }
      result.minX = min(result.minX, localX); result.maxX = max(result.maxX, localX)
      result.minY = min(result.minY, localY); result.maxY = max(result.maxY, localY)
    }}
    return result
  }

  let snapshot = output
  let allBounds = (0..<4).flatMap { row in
    (0..<4).map { bounds(row: row, frame: $0, pixels: snapshot) }
  }
  let targetBaseline = allBounds.filter { !$0.isEmpty }.map(\.maxY).max() ?? (frameSize - 1)
  let targetCenter = Double(frameSize - 1) / 2.0
  for row in 0..<4 {
    let rowBounds = (0..<4).map { bounds(row: row, frame: $0, pixels: snapshot) }
    for frame in 0..<4 {
      let frameBounds = rowBounds[frame]
      guard !frameBounds.isEmpty else { continue }
      let center = Double(frameBounds.minX + frameBounds.maxX) / 2.0
      let dx = Int((targetCenter - center).rounded())
      let dy = targetBaseline - frameBounds.maxY

      for localY in 0..<frameSize { for localX in 0..<frameSize {
        let destination = ((row * frameSize + localY) * outputSize + frame * frameSize + localX) * bpp
        for channel in 0..<bpp { output[destination + channel] = 0 }
      }}
      for localY in 0..<frameSize { for localX in 0..<frameSize {
        let destinationX = localX + dx, destinationY = localY + dy
        guard destinationX >= 0, destinationX < frameSize,
              destinationY >= 0, destinationY < frameSize else { continue }
        let source = ((row * frameSize + localY) * outputSize + frame * frameSize + localX) * bpp
        let destination = ((row * frameSize + destinationY) * outputSize + frame * frameSize + destinationX) * bpp
        for channel in 0..<bpp { output[destination + channel] = snapshot[source + channel] }
      }}
    }
  }
}

if mirrorRight {
  // Runtime rows are down, left, right, up. Build right from the finalized
  // left row so wheel centers, frame mass and pedal timing cannot diverge.
  let snapshot = output
  for frame in 0..<4 { for localY in 0..<frameSize { for localX in 0..<frameSize {
    let sourceX = frame * frameSize + localX
    let sourceY = frameSize + localY
    let destinationX = frame * frameSize + (frameSize - 1 - localX)
    let destinationY = frameSize * 2 + localY
    let sourceOffset = (sourceY * outputSize + sourceX) * bpp
    let destinationOffset = (destinationY * outputSize + destinationX) * bpp
    for channel in 0..<bpp { output[destinationOffset + channel] = snapshot[sourceOffset + channel] }
  }}}
}

// CGContext stores the generated row bands bottom-up when the source is
// cropped into a newly allocated bitmap. Reverse only the four 128px bands
// before encoding so the PNG retains the input's visual direction order;
// unlike flipping the whole canvas, this keeps every rider upright.
let bandSnapshot = output
for destinationRow in 0..<4 {
  let sourceRow = 3 - destinationRow
  for localY in 0..<frameSize {
    let sourceStart = ((sourceRow * frameSize + localY) * outputSize) * bpp
    let destinationStart = ((destinationRow * frameSize + localY) * outputSize) * bpp
    output.replaceSubrange(destinationStart..<(destinationStart + outputRowBytes),
                           with: bandSnapshot[sourceStart..<(sourceStart + outputRowBytes)])
  }
}

guard let finalContext = CGContext(data: &output, width: outputSize, height: outputSize,
                                   bitsPerComponent: 8, bytesPerRow: outputRowBytes,
                                   space: colorSpace,
                                   bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
      let result = finalContext.makeImage(),
      let destination = CGImageDestinationCreateWithURL(outputURL as CFURL,
                                                        UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(destination, result, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
print("\(outputURL.path): \(outputSize)x\(outputSize) RGBA, 4x4 cells at \(frameSize)px")
