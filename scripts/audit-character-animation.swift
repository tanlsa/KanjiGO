import CoreGraphics
import Foundation
import ImageIO

// Audits the geometry that matters to KanjiGO's 4x4 character renderer.
// Rows are down, left, right, up. Cell size is inferred from each sheet so the
// same audit covers both the 64px fallback and 96px HD trial.

guard CommandLine.arguments.count > 1 else {
  fputs("Usage: swift scripts/audit-character-animation.swift SHEET.png [...]\n", stderr)
  exit(2)
}

let directions = ["down", "left", "right", "up"]

struct Bounds {
  var minX = Int.max, minY = Int.max, maxX = Int.min, maxY = Int.min
  var weight = 0.0, weightedX = 0.0, weightedY = 0.0

  mutating func include(x: Int, y: Int, alpha: UInt8) {
    guard alpha > 20 else { return }
    minX = min(minX, x); minY = min(minY, y)
    maxX = max(maxX, x); maxY = max(maxY, y)
    let value = Double(alpha) / 255.0
    weight += value; weightedX += Double(x) * value; weightedY += Double(y) * value
  }

  var centerX: Double { weight > 0 ? weightedX / weight : .nan }
  var centerY: Double { weight > 0 ? weightedY / weight : .nan }
  var description: String {
    guard weight > 0 else { return "empty" }
    return "[\(minX),\(minY)-\(maxX),\(maxY)] c(\(String(format: "%.2f", centerX)),\(String(format: "%.2f", centerY)))"
  }
}

for path in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
        image.width == image.height, image.width % 4 == 0 else {
    fputs("\(path): expected a square 4x4 sheet\n", stderr)
    continue
  }
  let cell = image.width / 4
  let geometryScale = Double(cell) / 64.0
  let headEnd = Int(floor(29.0 * geometryScale))
  let torsoStart = Int((27.0 * geometryScale).rounded())
  let torsoEnd = Int((44.0 * geometryScale).rounded())
  let lowerStart = Int((41.0 * geometryScale).rounded())

  let rowBytes = image.width * 4
  var pixels = [UInt8](repeating: 0, count: image.height * rowBytes)
  guard let context = CGContext(data: &pixels, width: image.width, height: image.height,
                                bitsPerComponent: 8, bytesPerRow: rowBytes,
                                space: CGColorSpaceCreateDeviceRGB(),
                                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { continue }
  // CoreGraphics uses a bottom-left drawing origin. Flipping makes the buffer's
  // row order match PNG/source coordinates used by the canvas renderer.
  context.translateBy(x: 0, y: CGFloat(image.height))
  context.scaleBy(x: 1, y: -1)
  context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))

  print("\n\(path)")
  for row in 0..<4 {
    var baselines: [Int] = [], headCenters: [Double] = [], torsoCenters: [Double] = []
    print("  \(directions[row]):")
    for frame in 0..<4 {
      var full = Bounds(), head = Bounds(), torso = Bounds(), lower = Bounds()
      for localY in 0..<cell {
        for localX in 0..<cell {
          let globalX = frame * cell + localX, globalY = row * cell + localY
          let alpha = pixels[globalY * rowBytes + globalX * 4 + 3]
          full.include(x: localX, y: localY, alpha: alpha)
          // Final sheets lock runtime head rows 0...14, represented as source
          // rows 0...29. Keep the audit inside that contract so shoulder/arm
          // motion cannot be misreported as head jitter.
          if localY <= headEnd { head.include(x: localX, y: localY, alpha: alpha) }
          if localY >= torsoStart && localY <= torsoEnd { torso.include(x: localX, y: localY, alpha: alpha) }
          if localY >= lowerStart { lower.include(x: localX, y: localY, alpha: alpha) }
        }
      }
      baselines.append(full.maxY); headCenters.append(head.centerX); torsoCenters.append(torso.centerX)
      print("    f\(frame): full \(full.description) headX \(String(format: "%.2f", head.centerX)) torsoX \(String(format: "%.2f", torso.centerX)) lower \(lower.description)")
    }
    let baselineRange = (baselines.max() ?? 0) - (baselines.min() ?? 0)
    let finiteHeads = headCenters.filter(\.isFinite), finiteTorsos = torsoCenters.filter(\.isFinite)
    let headDrift = (finiteHeads.max() ?? 0) - (finiteHeads.min() ?? 0)
    let torsoDrift = (finiteTorsos.max() ?? 0) - (finiteTorsos.min() ?? 0)
    print("    summary: baseline drift \(baselineRange)px, head center drift \(String(format: "%.2f", headDrift))px, torso center drift \(String(format: "%.2f", torsoDrift))px")
  }

  var runtimeGridMismatches = 0
  for y in stride(from: 0, to: image.height, by: 2) {
    for x in stride(from: 0, to: image.width, by: 2) {
      let anchor = (y * rowBytes + x * 4)
      for dy in 0..<2 { for dx in 0..<2 {
        let candidate = ((y + dy) * rowBytes + (x + dx) * 4)
        for channel in 0..<4 where pixels[anchor + channel] != pixels[candidate + channel] {
          runtimeGridMismatches += 1
          break
        }
      }}
    }
  }

  var directionalMirrorMismatches = 0
  for frame in 0..<4 { for localY in 0..<cell { for localX in 0..<cell {
    let leftX = frame * cell + localX
    let rightX = frame * cell + (cell - 1 - localX)
    let leftY = cell + localY
    let rightY = cell * 2 + localY
    let leftIndex = leftY * rowBytes + leftX * 4
    let rightIndex = rightY * rowBytes + rightX * 4
    if (0..<4).contains(where: { pixels[leftIndex + $0] != pixels[rightIndex + $0] }) {
      directionalMirrorMismatches += 1
    }
  }}}
  print("  runtime grid mismatches: \(runtimeGridMismatches)")
  print("  left/right mirror mismatches: \(directionalMirrorMismatches)")
}
