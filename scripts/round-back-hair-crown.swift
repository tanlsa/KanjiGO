import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 3 else {
  fputs("Usage: round-back-hair-crown.swift INPUT.png OUTPUT.png\n", stderr)
  exit(2)
}
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
      image.width == 512, image.height == 512 else {
  fputs("Expected a 512x512 V4 character sheet.\n", stderr)
  exit(1)
}

let size = 512, cell = 128, bpp = 4, rowBytes = size * bpp
var pixels = [UInt8](repeating: 0, count: size * rowBytes)
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let decode = CGContext(data: &pixels, width: size, height: size, bitsPerComponent: 8,
                             bytesPerRow: rowBytes, space: colorSpace,
                             bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
decode.interpolationQuality = .none
decode.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))

// Add a compact four-row crown above the approved back-facing hair. Colors are
// sampled from the existing first hair row, so the edit introduces no new
// palette and keeps eight source pixels of safe padding above the silhouette.
let crownRuns = [(8, 59, 66), (9, 53, 72), (10, 48, 77), (11, 44, 81)]
for frame in 0..<4 {
  for (localY, startX, endX) in crownRuns {
    for localX in startX...endX {
      let sourceX = min(83, max(41, localX))
      let sourceOffset = (((3 * cell + 12) * size) + frame * cell + sourceX) * bpp
      let destinationOffset = (((3 * cell + localY) * size) + frame * cell + localX) * bpp
      for channel in 0..<bpp { pixels[destinationOffset + channel] = pixels[sourceOffset + channel] }
    }
  }
}

guard let finalContext = CGContext(data: &pixels, width: size, height: size, bitsPerComponent: 8,
                                   bytesPerRow: rowBytes, space: colorSpace,
                                   bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
      let result = finalContext.makeImage(),
      let destination = CGImageDestinationCreateWithURL(output as CFURL,
                                                        UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(destination, result, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
print("\(output.path): rounded V4 back-facing hair crown")
