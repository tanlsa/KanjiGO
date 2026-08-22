import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

// Removes fake checkerboard/white backdrop trapped inside closed Kanji strokes.
// Seeds are intentionally per-sprite so white eyes, gloves and highlights survive.
let interiorSeeds: [String: [(Int, Int)]] = [
  "bun": [(126, 98)],
  "chou": [(111, 138), (140, 127)],
  "chuu": [(102, 110), (155, 110), (165, 125)],
  "en": [(99, 87), (158, 87)],
  "fish": [(128, 69), (128, 132)],
  "gaku": [(127, 104), (84, 104), (99, 104), (154, 104)],
  "getsu": [(130, 86), (130, 126)],
  "go": [(130, 140)],
  "hanashi": [(91, 150)],
  "higashi": [(108, 114), (147, 114)],
  "ji": [(87, 81), (87, 108), (87, 141)],
  "hon": [(107, 145), (148, 145)],
  "kan": [(130, 135), (130, 165)],
  "ki": [(123, 132)],
  "kin": [(128, 85), (106, 165), (148, 165)],
  "kou": [(128, 90), (128, 150)],
  "kou_school": [(115, 99), (133, 101), (170, 101)],
  "mae": [(105, 132), (105, 160)],
  "nana": [(133, 124), (158, 130)],
  "onna": [(128, 120)],
  "hyaku": [(128, 125), (128, 165)],
  "sho": [(128, 160), (128, 180)],
  "saki": [(96, 90)],
  "na": [(128, 75), (130, 150)],
  "sen": [(105, 95), (151, 95)],
  "mizu": [(96, 130), (159, 130)],
  "otoko": [(110, 62), (145, 62), (150, 124)],
  "nishi": [(126, 70), (128, 130)],
  "den": [(105, 132), (150, 132), (105, 152), (150, 152)],
  "go_lang": [(87, 157), (152, 157)],
  "shoku": [(127, 78), (128, 135), (115, 160), (145, 160)],
  "kuruma": [(95, 100), (140, 100)],
  "minami": [(92, 120), (112, 120), (142, 120), (160, 120)],
  "nani": [(139, 123)],
  "mai": [(108, 134), (142, 134), (137, 160)],
  "shiro": [(128, 123), (128, 158)],
  "ri": [(126, 82), (126, 128)],
  "haha": [(128, 80), (100, 133), (148, 133)],
  "migi": [(134, 151)],
  "yomu": [(126, 100), (126, 140)],
  "tomo": [(130, 135)],
  "hidari": [(108, 155)],
  "chichi": [(128, 118)],
  "ame": [(105, 145), (150, 145)],
  "an": [(94, 88), (94, 144), (155, 85), (158, 132), (158, 155)],
  "shutsu": [(105, 144), (150, 144)],
  "yon": [(125, 130)],
]

guard CommandLine.arguments.count > 1 else {
  fputs("Usage: clean-sprite-whitespace.swift FILE...\n", stderr)
  exit(2)
}

for path in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { continue }
  let width = image.width, height = image.height, bpp = 4, row = width * bpp
  var pixels = [UInt8](repeating: 0, count: height * row)
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  guard let context = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8,
                                bytesPerRow: row, space: colorSpace,
                                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { continue }
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

  func isBackdrop(_ position: Int, minChannel: Int, spreadLimit: Int) -> Bool {
    let i = position * bpp, r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2]), a = Int(pixels[i + 3])
    return a > 0 && min(r, g, b) >= minChannel && max(r, g, b) - min(r, g, b) <= spreadLimit
  }
  func clearComponent(from start: Int, minChannel: Int, spreadLimit: Int) -> Int {
    guard start >= 0, start < width * height, isBackdrop(start, minChannel: minChannel, spreadLimit: spreadLimit) else { return 0 }
    var seen = Set<Int>(), queue = [start], cursor = 0
    seen.insert(start)
    while cursor < queue.count {
      let p = queue[cursor]; cursor += 1
      let x = p % width, y = p / width
      let neighbors = [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
      for (nx, ny) in neighbors where nx >= 0 && ny >= 0 && nx < width && ny < height {
        let n = ny * width + nx
        if !seen.contains(n) && isBackdrop(n, minChannel: minChannel, spreadLimit: spreadLimit) { seen.insert(n); queue.append(n) }
      }
    }
    for p in seen { let i = p * bpp; pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0 }
    return seen.count
  }
  var removed = 0
  // Any pale backdrop still connected to the canvas edge is always unwanted.
  for x in 0..<width { removed += clearComponent(from: x, minChannel: 178, spreadLimit: 62); removed += clearComponent(from: (height - 1) * width + x, minChannel: 178, spreadLimit: 62) }
  for y in 0..<height { removed += clearComponent(from: y * width, minChannel: 178, spreadLimit: 62); removed += clearComponent(from: y * width + width - 1, minChannel: 178, spreadLimit: 62) }

  let id = url.deletingLastPathComponent().lastPathComponent
  let interiorMin = id == "ki" ? 205 : 150
  let interiorSpread = id == "ki" ? 30 : 120
  for (x, y) in interiorSeeds[id] ?? [] {
    removed += clearComponent(from: y * width + x, minChannel: interiorMin, spreadLimit: interiorSpread)
  }

  // A few generated sprites contain a baked light panel made of several
  // disconnected shades. Constrain cleanup to the known glyph opening.
  if id == "hanashi" {
    for y in 146...153 { for x in 86...96 {
      let p = y * width + x, i = p * bpp
      if pixels[i + 3] > 0 { pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0; removed += 1 }
    }}
  } else if id == "kan" {
    for y in 105...175 { for x in 101...169 {
      let p = y * width + x, i = p * bpp
      if pixels[i + 3] > 0 && max(pixels[i], pixels[i + 1], pixels[i + 2]) > 92 {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0; removed += 1
      }
    }}
    func paintRect(_ x1: Int, _ y1: Int, _ x2: Int, _ y2: Int, _ color: (UInt8, UInt8, UInt8, UInt8)) {
      for py in y1...y2 { for px in x1...x2 {
        let i = (py * width + px) * bpp
        pixels[i] = color.0; pixels[i + 1] = color.1; pixels[i + 2] = color.2; pixels[i + 3] = color.3
      }}
    }
    // Rebuild a compact pixel face without reintroducing an opaque face panel.
    let ink: (UInt8, UInt8, UInt8, UInt8) = (5, 16, 54, 255)
    let iris: (UInt8, UInt8, UInt8, UInt8) = (28, 113, 210, 255)
    let shine: (UInt8, UInt8, UInt8, UInt8) = (236, 252, 255, 255)
    for eyeX in [112, 144] {
      paintRect(eyeX, 118, eyeX + 13, 139, shine)
      paintRect(eyeX + 2, 120, eyeX + 11, 138, ink)
      paintRect(eyeX + 4, 127, eyeX + 9, 136, iris)
      paintRect(eyeX + 3, 121, eyeX + 6, 125, shine)
    }
    paintRect(126, 150, 142, 152, ink)
    paintRect(128, 153, 140, 155, ink)
    paintRect(131, 156, 137, 157, ink)
  }

  guard let outputContext = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8,
                                      bytesPerRow: row, space: colorSpace,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
        let output = outputContext.makeImage(),
        let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { continue }
  CGImageDestinationAddImage(destination, output, nil)
  guard CGImageDestinationFinalize(destination) else { continue }
  print("\(id): removed \(removed) backdrop pixels")
}
