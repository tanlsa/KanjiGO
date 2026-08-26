import CoreGraphics
import Foundation
import ImageIO

guard CommandLine.arguments.count > 1 else {
  fputs("Usage: audit-sprite-whitespace.swift FILE...\n", stderr)
  exit(2)
}

for path in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { continue }
  let width = image.width, height = image.height, bpp = 4, row = width * bpp
  var pixels = [UInt8](repeating: 0, count: height * row)
  guard let context = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8,
                                bytesPerRow: row, space: CGColorSpaceCreateDeviceRGB(),
                                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { continue }
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  func isWhite(_ position: Int) -> Bool {
    let i = position * bpp, r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2]), a = Int(pixels[i + 3])
    return a > 220 && min(r, g, b) >= 205 && max(r, g, b) - min(r, g, b) <= 28
  }
  var seen = [Bool](repeating: false, count: width * height), components: [(Int, Int, Int, Int, Int, Int, Int)] = []
  for start in 0..<(width * height) where !seen[start] && isWhite(start) {
    var queue = [start], cursor = 0, count = 0
    var minX = width, minY = height, maxX = 0, maxY = 0
    seen[start] = true
    while cursor < queue.count {
      let p = queue[cursor]; cursor += 1; count += 1
      let x = p % width, y = p / width
      minX = min(minX, x); minY = min(minY, y); maxX = max(maxX, x); maxY = max(maxY, y)
      for n in [p - 1, p + 1, p - width, p + width] where n >= 0 && n < width * height {
        if (n == p - 1 || n == p + 1) && n / width != y { continue }
        if !seen[n] && isWhite(n) { seen[n] = true; queue.append(n) }
      }
    }
    if count >= 8 { components.append((count, minX, minY, maxX, maxY, start % width, start / width)) }
  }
  let details = components.sorted { $0.0 > $1.0 }.prefix(12).map {
    "\($0.0)@[\($0.1),\($0.2)-\($0.3),\($0.4)] seed(\($0.5),\($0.6))"
  }.joined(separator: " ")
  print("\(path): \(details)")
}
