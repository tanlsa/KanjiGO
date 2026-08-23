import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 5,
      let outputWidth = Int(CommandLine.arguments[3]),
      let outputHeight = Int(CommandLine.arguments[4]),
      outputWidth > 0, outputHeight > 0 else {
  fputs("Usage: prepare-academy-sprite.swift INPUT OUTPUT WIDTH HEIGHT\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fputs("Cannot decode academy source.\n", stderr); exit(1)
}

let width = image.width, height = image.height, bpp = 4, row = width * bpp
var pixels = [UInt8](repeating: 0, count: height * row)
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8,
                              bytesPerRow: row, space: colorSpace,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
context.interpolationQuality = .none
context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

func isBackdrop(_ position: Int) -> Bool {
  let i = position * bpp
  let r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
  return min(r, g, b) >= 215 && max(r, g, b) - min(r, g, b) <= 22
}

var visited = [Bool](repeating: false, count: width * height)
var queue = [Int](); queue.reserveCapacity(width * height / 2)
func enqueue(_ x: Int, _ y: Int) {
  guard x >= 0, y >= 0, x < width, y < height else { return }
  let position = y * width + x
  if !visited[position] && isBackdrop(position) { visited[position] = true; queue.append(position) }
}
for x in 0..<width { enqueue(x, 0); enqueue(x, height - 1) }
for y in 0..<height { enqueue(0, y); enqueue(width - 1, y) }
var cursor = 0
while cursor < queue.count {
  let position = queue[cursor]; cursor += 1
  let x = position % width, y = position / width, i = position * bpp
  pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0
  enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1)
}

var minX = width, minY = height, maxX = -1, maxY = -1
for y in 0..<height { for x in 0..<width {
  if pixels[(y * width + x) * bpp + 3] > 0 {
    minX = min(minX, x); minY = min(minY, y); maxX = max(maxX, x); maxY = max(maxY, y)
  }
}}
guard maxX >= minX, maxY >= minY,
      let cutoutContext = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8,
                                    bytesPerRow: row, space: colorSpace,
                                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
      let cutout = cutoutContext.makeImage()?.cropping(to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)) else { exit(1) }

let inset = 3
var outputPixels = [UInt8](repeating: 0, count: outputWidth * outputHeight * bpp)
guard let outputContext = CGContext(data: &outputPixels, width: outputWidth, height: outputHeight, bitsPerComponent: 8,
                                    bytesPerRow: outputWidth * bpp, space: colorSpace,
                                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
outputContext.interpolationQuality = .none
let scale = min(CGFloat(outputWidth - inset * 2) / CGFloat(cutout.width), CGFloat(outputHeight - inset * 2) / CGFloat(cutout.height))
let drawWidth = CGFloat(cutout.width) * scale, drawHeight = CGFloat(cutout.height) * scale
let destinationRect = CGRect(x: (CGFloat(outputWidth) - drawWidth) / 2, y: CGFloat(outputHeight - inset) - drawHeight,
                             width: drawWidth, height: drawHeight)
outputContext.draw(cutout, in: destinationRect)

guard let output = outputContext.makeImage(),
      let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(destination, output, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
print("Prepared academy sprite \(outputWidth)x\(outputHeight): \(outputURL.path)")
