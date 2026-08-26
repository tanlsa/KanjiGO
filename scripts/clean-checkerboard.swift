import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 3 else {
  fputs("Usage: clean-checkerboard.swift INPUT OUTPUT\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fputs("Cannot decode input PNG.\n", stderr)
  exit(1)
}

let width = image.width, height = image.height, bytesPerPixel = 4, bytesPerRow = width * bytesPerPixel
var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8,
                              bytesPerRow: bytesPerRow, space: colorSpace,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
context.interpolationQuality = .none
context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

func isBackground(_ index: Int) -> Bool {
  let r = Int(pixels[index]), g = Int(pixels[index + 1]), b = Int(pixels[index + 2])
  return min(r, g, b) >= 218 && max(r, g, b) - min(r, g, b) <= 16
}

var visited = [Bool](repeating: false, count: width * height)
var queue = [Int](); queue.reserveCapacity(width * height / 2)
func enqueue(_ x: Int, _ y: Int) {
  guard x >= 0, y >= 0, x < width, y < height else { return }
  let position = y * width + x, index = position * bytesPerPixel
  if !visited[position] && isBackground(index) { visited[position] = true; queue.append(position) }
}
for x in 0..<width { enqueue(x, 0); enqueue(x, height - 1) }
for y in 0..<height { enqueue(0, y); enqueue(width - 1, y) }

var cursor = 0
while cursor < queue.count {
  let position = queue[cursor]; cursor += 1
  let x = position % width, y = position / width, index = position * bytesPerPixel
  pixels[index] = 0; pixels[index + 1] = 0; pixels[index + 2] = 0; pixels[index + 3] = 0
  enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1)
}

guard let cutoutContext = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8,
                                    bytesPerRow: bytesPerRow, space: colorSpace,
                                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
      let cutout = cutoutContext.makeImage() else { exit(1) }

var minX = width, minY = height, maxX = -1, maxY = -1
for y in 0..<height { for x in 0..<width {
  if pixels[(y * width + x) * bytesPerPixel + 3] > 0 {
    minX = min(minX, x); minY = min(minY, y); maxX = max(maxX, x); maxY = max(maxY, y)
  }
}}
guard maxX >= minX, maxY >= minY,
      let cropped = cutout.cropping(to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)) else {
  fputs("No foreground pixels remain after background cleanup.\n", stderr)
  exit(1)
}

let canvasSize = 256, inset = 12
var outputPixels = [UInt8](repeating: 0, count: canvasSize * canvasSize * bytesPerPixel)
guard let outputContext = CGContext(data: &outputPixels, width: canvasSize, height: canvasSize, bitsPerComponent: 8,
                                    bytesPerRow: canvasSize * bytesPerPixel, space: colorSpace,
                                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
outputContext.interpolationQuality = .none
let scale = min(CGFloat(canvasSize - inset * 2) / CGFloat(cropped.width), CGFloat(canvasSize - inset * 2) / CGFloat(cropped.height))
let drawWidth = CGFloat(cropped.width) * scale, drawHeight = CGFloat(cropped.height) * scale
let rect = CGRect(x: (CGFloat(canvasSize) - drawWidth) / 2, y: (CGFloat(canvasSize) - drawHeight) / 2,
                  width: drawWidth, height: drawHeight)
outputContext.draw(cropped, in: rect)

guard let outputImage = outputContext.makeImage(),
      let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(destination, outputImage, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
