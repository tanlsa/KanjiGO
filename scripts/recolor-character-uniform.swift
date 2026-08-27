import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 3 else {
  fputs("Usage: recolor-character-uniform.swift INPUT.png OUTPUT.png\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fputs("Cannot decode input image.\n", stderr)
  exit(1)
}

let width = image.width, height = image.height, bytesPerPixel = 4
guard width == height, width % 4 == 0 else {
  fputs("Expected a square 4x4 character sheet.\n", stderr)
  exit(2)
}
let frameSize = width / 4
let frameScale = Double(frameSize) / 64.0
var pixels = [UInt8](repeating: 0, count: width * height * bytesPerPixel)
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(
  data: &pixels,
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: width * bytesPerPixel,
  space: colorSpace,
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else { exit(1) }
context.interpolationQuality = .none
context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

// Replace only the saturated orange uniform palette inside the upper-body band
// of each frame. Restricting the edit by local Y keeps orange shoe accents,
// skin, hair, trousers and the employee badge untouched.
for position in 0..<(width * height) {
  let index = position * bytesPerPixel
  let localY = (position / width) % frameSize
  let red = Int(pixels[index]), green = Int(pixels[index + 1]), blue = Int(pixels[index + 2])
  // The runtime sheet is authored in 2x2 source clusters. Keep both rows of
  // the final 44...45 cluster inside the uniform band so recoloring cannot
  // split one displayed pixel into two colors.
  guard pixels[index + 3] > 0,
        localY >= Int((24.0 * frameScale).rounded()),
        localY <= Int((45.0 * frameScale).rounded()),
        red >= 120, green >= 35, green <= 132, blue <= 72,
        red - green >= 55, green - blue >= 18 else { continue }

  let brightness = Double(max(red, green)) / 255.0
  pixels[index] = UInt8(max(8, min(40, Int(8 + brightness * 28))))
  pixels[index + 1] = UInt8(max(62, min(154, Int(58 + brightness * 96))))
  pixels[index + 2] = UInt8(max(35, min(96, Int(32 + brightness * 60))))
}

guard let outputContext = CGContext(
  data: &pixels,
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: width * bytesPerPixel,
  space: colorSpace,
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
), let outputImage = outputContext.makeImage(),
   let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
  exit(1)
}
CGImageDestinationAddImage(destination, outputImage, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
