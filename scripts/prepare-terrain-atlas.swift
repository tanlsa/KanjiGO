import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard [3, 6, 7].contains(CommandLine.arguments.count) else {
  fputs("Usage: prepare-terrain-atlas.swift INPUT OUTPUT_STRIP [COLUMNS ROWS TILE_COUNT [legacy]]\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fputs("Cannot decode terrain atlas.\n", stderr); exit(1)
}

let customGrid = CommandLine.arguments.count >= 6
let columns = customGrid ? Int(CommandLine.arguments[3]) ?? 0 : 4
let rows = customGrid ? Int(CommandLine.arguments[4]) ?? 0 : 4
let tileCount = customGrid ? Int(CommandLine.arguments[5]) ?? 0 : 16
let legacyObjectCrop = CommandLine.arguments.count == 7 && CommandLine.arguments[6] == "legacy"
let tile = 32, channels = 4
guard columns > 0, rows > 0, tileCount > 0, tileCount <= columns * rows,
      image.width >= columns, image.height >= rows else { exit(1) }
let sourceRow = image.width * channels
var sourcePixels = [UInt8](repeating: 0, count: image.height * sourceRow)
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let sourceContext = CGContext(data: &sourcePixels, width: image.width, height: image.height, bitsPerComponent: 8,
                                    bytesPerRow: sourceRow, space: colorSpace,
                                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
sourceContext.interpolationQuality = .none
sourceContext.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))

let outputWidth = tileCount * tile, outputHeight = tile
var outputPixels = [UInt8](repeating: 255, count: outputWidth * outputHeight * channels)
for gridY in 0..<rows {
  for gridX in 0..<columns {
    let index = gridY * columns + gridX
    if index >= tileCount { continue }
    let rawMinX = gridX * image.width / columns, rawMaxX = (gridX + 1) * image.width / columns
    let rawMinY = gridY * image.height / rows, rawMaxY = (gridY + 1) * image.height / rows
    // Tree, encounter grass and dock need a stronger silhouette at 32px. Crop
    // only these object cells; seamless base tiles retain their full source cell.
    let cropRatio: Double = legacyObjectCrop && [1, 6].contains(index) ? 0.12 : legacyObjectCrop && index == 5 ? 0.06 : 0
    let insetX = Int(Double(rawMaxX - rawMinX) * cropRatio)
    let insetY = Int(Double(rawMaxY - rawMinY) * cropRatio)
    let minX = rawMinX + insetX, maxX = rawMaxX - insetX
    let minY = rawMinY + insetY, maxY = rawMaxY - insetY
    let cellWidth = maxX - minX, cellHeight = maxY - minY
    for y in 0..<tile {
      for x in 0..<tile {
        let sourceX = min(maxX - 1, minX + x * cellWidth / tile)
        let sourceY = min(maxY - 1, minY + y * cellHeight / tile)
        let sourceIndex = (sourceY * image.width + sourceX) * channels
        let outputIndex = (y * outputWidth + index * tile + x) * channels
        for channel in 0..<channels { outputPixels[outputIndex + channel] = sourcePixels[sourceIndex + channel] }
        outputPixels[outputIndex + 3] = 255
      }
    }
  }
}

if legacyObjectCrop {
  // Mirror-blend opposite borders for the repeatable grass, water and path
  // cells. This removes visible 32px grid lines without blurring the center.
  for index in [0, 2, 3] where index < tileCount {
    let tileOffset = index * tile
    for inset in 0..<3 {
      let leftX = tileOffset + inset, rightX = tileOffset + tile - 1 - inset
      for y in 0..<tile {
        for channel in 0..<3 {
          let left = (y * outputWidth + leftX) * channels + channel
          let right = (y * outputWidth + rightX) * channels + channel
          let blended = UInt8((UInt16(outputPixels[left]) + UInt16(outputPixels[right])) / 2)
          outputPixels[left] = blended; outputPixels[right] = blended
        }
      }
      let topY = inset, bottomY = tile - 1 - inset
      for x in 0..<tile {
        for channel in 0..<3 {
          let top = (topY * outputWidth + tileOffset + x) * channels + channel
          let bottom = (bottomY * outputWidth + tileOffset + x) * channels + channel
          let blended = UInt8((UInt16(outputPixels[top]) + UInt16(outputPixels[bottom])) / 2)
          outputPixels[top] = blended; outputPixels[bottom] = blended
        }
      }
    }
  }
}

guard let outputContext = CGContext(data: &outputPixels, width: outputWidth, height: outputHeight, bitsPerComponent: 8,
                                    bytesPerRow: outputWidth * channels, space: colorSpace,
                                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
      let outputImage = outputContext.makeImage(),
      let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(destination, outputImage, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
print("Prepared \(tileCount) terrain tiles at \(tile)x\(tile): \(outputURL.path)")
