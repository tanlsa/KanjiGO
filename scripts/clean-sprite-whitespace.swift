import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

// Removes fake checkerboard/white backdrop trapped inside closed Kanji strokes.
// Seeds are intentionally per-sprite so white eyes, gloves and highlights survive.
let interiorSeeds: [String: [(Int, Int)]] = [
  "aku": [(126, 68), (126, 95), (126, 122)],
  "bun": [(126, 98)],
  "chou": [(111, 138), (140, 127)],
  "chuu": [(102, 110), (155, 110), (165, 125)],
  "en": [(90, 75), (100, 75), (110, 75), (90, 85), (100, 85), (110, 85),
         (90, 98), (100, 98), (110, 98), (150, 82), (164, 95)],
  "fish": [(128, 69), (128, 132)],
  "gaku": [(127, 104), (84, 104), (99, 104), (154, 104)],
  "getsu": [(130, 86), (130, 126)],
  "go": [(130, 140)],
  "hanashi": [(91, 150)],
  "higashi": [(108, 114), (147, 114)],
  "ji": [(87, 81), (87, 108), (87, 141)],
  "hon": [(107, 145), (111, 145), (112, 148), (148, 145)],
  "kan": [(130, 135), (130, 165)],
  "ki": [(123, 132)],
  "i_med": [(120, 145), (135, 145), (150, 150)],
  "ken": [(126, 95), (114, 69), (140, 69), (114, 123), (140, 123)],
  "kin": [(128, 85), (110, 142), (116, 142), (120, 150), (114, 156),
          (148, 148), (106, 165), (148, 165)],
  "kou": [(100, 135), (110, 135), (125, 135), (145, 135), (155, 135),
          (100, 150), (110, 150), (145, 150), (155, 150),
          (100, 170), (110, 180), (145, 180), (155, 170)],
  "kou_school": [(115, 99), (133, 101), (170, 101)],
  "mae": [(105, 132), (105, 160)],
  "nana": [(133, 124), (158, 130)],
  "onna": [(128, 120)],
  "hyaku": [(128, 125), (128, 165)],
  "sho": [(131, 141), (118, 103), (145, 103), (143, 77), (146, 89), (144, 63)],
  "saki": [(96, 90)],
  "na": [(128, 75), (130, 150)],
  "sen": [(105, 95), (151, 95)],
  "mizu": [(96, 130), (159, 130), (110, 150)],
  "ten": [],
  "utsu": [(98, 87), (98, 143), (132, 145), (124, 106), (141, 100), (161, 101)],
  "institute": [(110, 88), (90, 108), (145, 87), (145, 93), (175, 148), (111, 76)],
  "ga_art": [(100, 116), (145, 116), (118, 154), (94, 137), (130, 107), (110, 136)],
  "natsu": [(130, 94), (140, 141), (130, 160)],
  "kai_turn": [(110, 145), (128, 130), (125, 112), (143, 98), (147, 76)],
  "tanoshi": [(88, 117), (164, 117), (127, 87), (127, 111)],
  "kaeru": [(135, 144), (155, 142)],
  "ku_district": [(109, 80), (140, 137), (92, 93)],
  "kuro": [(92, 67), (141, 64), (78, 140), (104, 128)],
  "ani": [(102, 72), (171, 71), (143, 146)],
  "sumu": [(105, 83)],
  "hiraku": [(97, 132), (146, 87), (97, 87)],
  "au": [(93, 145), (118, 71)],
  "hikui": [(109, 87), (155, 157), (135, 131), (141, 89)],
  "otoko": [(110, 62), (145, 62), (150, 124)],
  "nishi": [(126, 70), (128, 130), (91, 120), (162, 108), (87, 96)],
  "den": [(105, 132), (150, 132), (105, 152), (150, 152)],
  "go_lang": [(87, 157), (152, 157)],
  "shoku": [(120, 85), (130, 85), (140, 85), (129, 49)],
  "kuruma": [(95, 100), (140, 100)],
  "minami": [(92, 120), (112, 120), (142, 120), (160, 120)],
  "nani": [(139, 123)],
  "mai": [(108, 134), (142, 134), (137, 160)],
  "shiro": [(128, 123), (128, 158)],
  "ri": [(126, 82), (126, 128)],
  // The upper opening contains the intentional pair of eye highlights. Its
  // baked backdrop is handled by the targeted pass below.
  "haha": [(100, 135), (150, 135)],
  "migi": [(134, 151)],
  "uta": [(130, 105), (136, 105), (144, 105), (130, 115), (136, 115), (144, 115),
          (130, 130), (136, 130), (144, 130), (130, 145), (136, 145), (144, 145),
          (130, 156), (136, 156), (144, 156), (152, 100), (160, 105), (168, 110),
          (108, 140)],
  "ya": [(110, 80), (135, 80), (96, 112), (135, 127)],
  "yomu": [(118, 85), (135, 85), (118, 112), (135, 112), (92, 149), (85, 66)],
  "tomo": [(130, 135)],
  "tooi": [(111, 151), (145, 145), (158, 145), (145, 156), (158, 156)],
  "hidari": [(108, 155)],
  "chichi": [(128, 118)],
  "ame": [(105, 145), (150, 145)],
  "an": [(94, 88), (94, 144), (155, 85), (158, 132), (158, 155)],
  "shutsu": [(105, 144), (150, 144)],
  "yon": [(88, 100), (92, 130), (151, 112), (155, 120), (158, 105)],
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
  if id == "ten" {
    // 天 uses broad neutral-white shading across the Kanji body. On colored
    // game backgrounds this resembles an uncleared backdrop, so keep the
    // highlight geometry but tint it into the mascot's cyan palette. Preserve
    // the tiny white eye glints for expression.
    for y in 50...165 { for x in 55...190 {
      let isLeftEyeGlint = (98...106).contains(x) && (76...84).contains(y)
      let isRightEyeGlint = (148...156).contains(x) && (76...84).contains(y)
      if isLeftEyeGlint || isRightEyeGlint { continue }
      let p = y * width + x, i = p * bpp
      let r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
      let low = min(r, g, b), high = max(r, g, b)
      if pixels[i + 3] > 0 && low >= 178 && high - low <= 62 {
        let tone = min(77, max(0, high - 178))
        pixels[i] = UInt8(70 + tone * 30 / 77)
        pixels[i + 1] = UInt8(175 + tone * 35 / 77)
        pixels[i + 2] = UInt8(225 + tone * 30 / 77)
      }
    }}
  } else if id == "hanashi" {
    for y in 146...153 { for x in 86...96 {
      let p = y * width + x, i = p * bpp
      if pixels[i + 3] > 0 { pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0; removed += 1 }
    }}
  } else if id == "kou" {
    for y in 128...186 { for x in 94...161 {
      let p = y * width + x, i = p * bpp
      let r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
      if pixels[i + 3] > 0 && min(r, g, b) >= 205 && max(r, g, b) - min(r, g, b) <= 28 {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0; removed += 1
      }
    }}
  } else if id == "uta" {
    for (x1, y1, x2, y2) in [(149, 97, 172, 113), (106, 127, 110, 159), (87, 141, 94, 144)] {
      for y in y1...y2 { for x in x1...x2 {
        let p = y * width + x, i = p * bpp
        let r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
        if pixels[i + 3] > 0 && min(r, g, b) >= 205 && max(r, g, b) - min(r, g, b) <= 28 {
          pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0; removed += 1
        }
      }}
    }
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
  } else if id == "haha" {
    // Keep the two intentional eye highlights, but remove the pale generated
    // face panel trapped inside the upper opening of 母.
    for y in 55...90 { for x in 84...177 {
      let isLeftEyeHighlight = (99...110).contains(x) && (64...73).contains(y)
      let isRightEyeHighlight = (147...158).contains(x) && (64...73).contains(y)
      if isLeftEyeHighlight || isRightEyeHighlight { continue }
      let p = y * width + x, i = p * bpp
      let r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
      if pixels[i + 3] > 0 && min(r, g, b) >= 170 && max(r, g, b) - min(r, g, b) <= 72 {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0; removed += 1
      }
    }}
    // Clear the small checkerboard wedge behind the bottle without touching
    // the bottle/glove themselves.
    for y in 134...159 { for x in 190...203 {
      let p = y * width + x, i = p * bpp
      let r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
      if pixels[i + 3] > 0 && min(r, g, b) >= 170 && max(r, g, b) - min(r, g, b) <= 72 {
        pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0; removed += 1
      }
    }}
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
