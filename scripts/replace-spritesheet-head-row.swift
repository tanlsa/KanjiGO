import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 6,
      let row = Int(CommandLine.arguments[4]),
      let headHeight = Int(CommandLine.arguments[5]),
      (0..<4).contains(row) else {
  fputs("Usage: replace-spritesheet-head-row.swift BASE.png DONOR.png OUTPUT.png ROW HEAD_HEIGHT\n", stderr)
  exit(2)
}

func load(_ path: String) -> CGImage? {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
  return CGImageSourceCreateImageAtIndex(source, 0, nil)
}

guard let base = load(CommandLine.arguments[1]), let donor = load(CommandLine.arguments[2]),
      base.width == base.height, donor.width == base.width, donor.height == base.height,
      base.width % 4 == 0 else {
  fputs("BASE and DONOR must be matching square 4x4 sheets.\n", stderr)
  exit(1)
}

let width = base.width, height = base.height, cell = width / 4, bpp = 4, rowBytes = width * bpp
guard headHeight > 0, headHeight <= cell else { exit(2) }
let colorSpace = CGColorSpaceCreateDeviceRGB()
func decode(_ image: CGImage) -> [UInt8] {
  var data = [UInt8](repeating: 0, count: height * rowBytes)
  let context = CGContext(data: &data, width: width, height: height, bitsPerComponent: 8,
                          bytesPerRow: rowBytes, space: colorSpace,
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  context.interpolationQuality = .none
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  return data
}

var output = decode(base)
let replacement = decode(donor)
let startY = row * cell
for y in startY..<(startY + headHeight) {
  let start = y * rowBytes
  output.replaceSubrange(start..<(start + rowBytes), with: replacement[start..<(start + rowBytes)])
}

guard let context = CGContext(data: &output, width: width, height: height, bitsPerComponent: 8,
                              bytesPerRow: rowBytes, space: colorSpace,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
      let result = context.makeImage(),
      let destination = CGImageDestinationCreateWithURL(
        URL(fileURLWithPath: CommandLine.arguments[3]) as CFURL,
        UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(destination, result, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
print("\(CommandLine.arguments[3]): replaced head region for row \(row), height \(headHeight)")
