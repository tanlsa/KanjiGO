import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 4 else {
  fputs("Usage: prepare-tulip-atlas.swift TULIP_ATLAS TERRAIN_ATLAS OUTPUT\n", stderr)
  exit(2)
}

func load(_ path: String) -> CGImage {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fputs("Cannot decode \(path).\n", stderr); exit(1)
  }
  return image
}

func pixels(of image: CGImage) -> [UInt8] {
  let channels = 4, row = image.width * channels
  var result = [UInt8](repeating: 0, count: image.height * row)
  guard let context = CGContext(data: &result, width: image.width, height: image.height,
                                bitsPerComponent: 8, bytesPerRow: row,
                                space: CGColorSpaceCreateDeviceRGB(),
                                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
  context.interpolationQuality = .none
  context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
  return result
}

let tulips = load(CommandLine.arguments[1]), terrain = load(CommandLine.arguments[2])
let tile = 32, variants = 4, channels = 4, vividGrassIndex = 8
guard tulips.width == variants * tile, tulips.height == tile,
      terrain.width >= (vividGrassIndex + 1) * tile, terrain.height >= tile else {
  fputs("Expected a 128x32 tulip atlas and a terrain atlas containing VIVID_GRASS.\n", stderr); exit(1)
}

let source = pixels(of: tulips), ground = pixels(of: terrain)
var flowerMask = [Bool](repeating: false, count: tulips.width * tulips.height)
for y in 0..<tile { for x in 0..<tulips.width {
  let i = (y * tulips.width + x) * channels
  let r = Int(source[i]), g = Int(source[i + 1]), b = Int(source[i + 2])
  let redOrPink = r > g + 16 && r > 125
  let yellow = r > 145 && g > 125 && r >= g - 5 && b + 30 < min(r, g)
  let white = r > 178 && g > 178 && b > 162 && abs(r - g) < 30 && abs(g - b) < 30
  flowerMask[y * tulips.width + x] = redOrPink || yellow || white
} }

// Preserve one pixel of nearby stem/leaf so small blossoms remain readable,
// while every other green pixel comes from the map's exact grass tile.
var detailMask = flowerMask
for y in 0..<tile { for x in 0..<tulips.width where flowerMask[y * tulips.width + x] {
  for oy in -1...2 { for ox in -1...1 {
    let nx = x + ox, ny = y + oy
    if nx >= 0 && nx < tulips.width && ny >= 0 && ny < tile { detailMask[ny * tulips.width + nx] = true }
  } }
} }

var output = source
for y in 0..<tile { for x in 0..<tulips.width {
  let i = (y * tulips.width + x) * channels
  let baseX = vividGrassIndex * tile + (x % tile)
  let base = (y * terrain.width + baseX) * channels
  if !detailMask[y * tulips.width + x] {
    output[i] = ground[base]; output[i + 1] = ground[base + 1]; output[i + 2] = ground[base + 2]
  } else if !flowerMask[y * tulips.width + x] {
    // Dark stems are softened into the native grass palette.
    output[i] = UInt8((Int(source[i]) + Int(ground[base]) * 2) / 3)
    output[i + 1] = UInt8((Int(source[i + 1]) + Int(ground[base + 1]) * 2) / 3)
    output[i + 2] = UInt8((Int(source[i + 2]) + Int(ground[base + 2]) * 2) / 3)
  }
  output[i + 3] = 255
} }

let outputURL = URL(fileURLWithPath: CommandLine.arguments[3])
guard let context = CGContext(data: &output, width: tulips.width, height: tile,
                              bitsPerComponent: 8, bytesPerRow: tulips.width * channels,
                              space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
      let image = context.makeImage(),
      let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
print("Matched tulip atlas to VIVID_GRASS: \(outputURL.path)")
