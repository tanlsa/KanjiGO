import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 2 else {
  fputs("Usage: generate-arena-wall-atlas.swift OUTPUT.png\n", stderr)
  exit(2)
}

let tile = 32, variants = 6, width = tile * variants, height = tile
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
                              bytesPerRow: width * 4, space: colorSpace,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
context.interpolationQuality = .none
context.setShouldAntialias(false)
context.clear(CGRect(x: 0, y: 0, width: width, height: height))

let dark = CGColor(red: 23/255, green: 36/255, blue: 60/255, alpha: 1)
let navy = CGColor(red: 36/255, green: 54/255, blue: 83/255, alpha: 1)
let steel = CGColor(red: 83/255, green: 116/255, blue: 154/255, alpha: 1)
let light = CGColor(red: 113/255, green: 147/255, blue: 184/255, alpha: 1)
let gold = CGColor(red: 215/255, green: 184/255, blue: 91/255, alpha: 1)

func fill(_ color: CGColor, _ x: Int, _ y: Int, _ w: Int, _ h: Int, tile index: Int) {
  context.setFillColor(color)
  context.fill(CGRect(x: index * tile + x, y: height - y - h, width: w, height: h))
}

func wallBase(_ index: Int) {
  // Every wall resource owns its complete 32×32 footprint. The previous
  // transparent margins exposed the cached grass below the Arena boundary.
  fill(dark, 0, 0, tile, tile, tile: index)
  fill(navy, 2, 2, tile - 4, tile - 4, tile: index)
  fill(steel, 2, 2, tile - 4, 3, tile: index)
  fill(light, 3, 3, tile - 6, 1, tile: index)
  fill(dark, 2, tile - 5, tile - 4, 3, tile: index)
  // Subtle block seams keep a full tile from reading as a flat UI rectangle.
  fill(dark, 4, 20, 10, 1, tile: index)
  fill(dark, 18, 20, 10, 1, tile: index)
  fill(dark, 15, 21, 1, 7, tile: index)
}

func horizontal(_ index: Int, start: Int = 0, end: Int = 32) {
  fill(dark, start, 8, end - start, 17, tile: index)
  fill(navy, start, 10, end - start, 13, tile: index)
  fill(steel, start, 10, end - start, 4, tile: index)
  fill(light, start, 11, end - start, 1, tile: index)
  fill(gold, start, 16, end - start, 2, tile: index)
  fill(dark, start, 23, end - start, 2, tile: index)
}

func vertical(_ index: Int, start: Int = 0, end: Int = 32) {
  fill(dark, 8, start, 17, end - start, tile: index)
  fill(navy, 10, start, 13, end - start, tile: index)
  fill(steel, 10, start, 4, end - start, tile: index)
  fill(light, 11, start, 1, end - start, tile: index)
  fill(gold, 16, start, 2, end - start, tile: index)
  fill(dark, 23, start, 2, end - start, tile: index)
}

func corner(_ index: Int, horizontalToRight: Bool, verticalToBottom: Bool) {
  let centerX = horizontalToRight ? 24 : 8
  let centerY = verticalToBottom ? 24 : 8
  let horizontalStart = horizontalToRight ? centerX : 0
  let horizontalEnd = horizontalToRight ? 32 : centerX + 1
  let verticalStart = verticalToBottom ? centerY : 0
  let verticalEnd = verticalToBottom ? 32 : centerY + 1
  horizontal(index, start: horizontalStart, end: horizontalEnd)
  vertical(index, start: verticalStart, end: verticalEnd)

  // A real pixel quarter-ring joins both arms. Radius 8 is the gold center
  // line, so the trim flows continuously around all four corner variants.
  for y in 0..<tile { for x in 0..<tile {
    let inQuadrantX = horizontalToRight ? x <= centerX : x >= centerX
    let inQuadrantY = verticalToBottom ? y <= centerY : y >= centerY
    guard inQuadrantX && inQuadrantY else { continue }
    let dx = Double(x - centerX), dy = Double(y - centerY)
    let distance = sqrt(dx * dx + dy * dy)
    guard distance >= 7 && distance <= 16 else { continue }
    let color: CGColor
    if distance < 9 { color = gold }
    else if distance < 12 { color = navy }
    else if distance < 15 { color = steel }
    else { color = dark }
    fill(color, x, y, 1, 1, tile: index)
  } }

  // One bright pixel on the outer bevel gives the rounded corner readable
  // depth at the game's 2× nearest-neighbor zoom.
  let highlightX = horizontalToRight ? centerX - 9 : centerX + 9
  let highlightY = verticalToBottom ? centerY - 9 : centerY + 9
  fill(light, highlightX, highlightY, 2, 2, tile: index)
}

// Runtime order: horizontal, vertical, top-left, top-right, bottom-left, bottom-right.
for index in 0..<variants { wallBase(index) }
horizontal(0)
vertical(1)
corner(2, horizontalToRight: true, verticalToBottom: true)
corner(3, horizontalToRight: false, verticalToBottom: true)
corner(4, horizontalToRight: true, verticalToBottom: false)
corner(5, horizontalToRight: false, verticalToBottom: false)

guard let image = context.makeImage(),
      let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL,
                                                        UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
print("Generated six arena wall tiles: \(CommandLine.arguments[1])")
