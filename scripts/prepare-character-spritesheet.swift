import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count >= 3 else {
  fputs("Usage: prepare-character-spritesheet.swift INPUT OUTPUT [--turnaround] [--player PLAYER_SHEET]\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let options = Array(CommandLine.arguments.dropFirst(3))
let turnaroundMode = options.contains("--turnaround")
let playerPath: String? = {
  guard let optionIndex = options.firstIndex(of: "--player"), options.indices.contains(optionIndex + 1) else { return nil }
  return options[optionIndex + 1]
}()
if options.contains("--player") && playerPath == nil {
  fputs("--player requires a sprite-sheet path.\n", stderr)
  exit(2)
}
guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fputs("Cannot decode input image.\n", stderr)
  exit(1)
}

let width = image.width, height = image.height, bpp = 4, row = width * bpp
var pixels = [UInt8](repeating: 0, count: height * row)
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let sourceContext = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8,
                                    bytesPerRow: row, space: colorSpace,
                                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
sourceContext.interpolationQuality = .none
sourceContext.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

// Generated sprite sheets sometimes contain a fake white/gray checkerboard.
// Remove every bright neutral pixel so enclosed wheel areas become transparent too.
for position in 0..<(width * height) {
  let i = position * bpp
  let r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
  if min(r, g, b) >= 218 && max(r, g, b) - min(r, g, b) <= 16 {
    pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0
  }
}

let outputSize = 128, grid = 4, sourceGrid = turnaroundMode ? 2 : 4, targetCell = outputSize / grid, inset = 1
var outputPixels = [UInt8](repeating: 0, count: outputSize * outputSize * bpp)

// Normalize every frame independently. AI source sheets often leave unequal
// whitespace per direction; bottom-aligning each non-transparent bounding box
// prevents side-facing bicycle frames from floating above the tile baseline.
for gridY in 0..<grid {
  for gridX in 0..<grid {
    // Turnaround source: TL front, TR left, BL right (ignored), BR back.
    // Runtime row order: down, left, right, up. Right is a deterministic
    // mirror of the canonical left view so both sides remain pixel-consistent.
    let sourcePosition: (x: Int, y: Int) = turnaroundMode
      ? [(0, 0), (1, 0), (1, 0), (1, 1)][gridY]
      : (gridX, gridY)
    let flipX = turnaroundMode && gridY == 2
    let sourceMinY = sourcePosition.y * height / sourceGrid, sourceMaxY = (sourcePosition.y + 1) * height / sourceGrid
    let sourceMinX = sourcePosition.x * width / sourceGrid, sourceMaxX = (sourcePosition.x + 1) * width / sourceGrid
    var minX = sourceMaxX, minY = sourceMaxY, maxX = sourceMinX - 1, maxY = sourceMinY - 1
    for y in sourceMinY..<sourceMaxY {
      for x in sourceMinX..<sourceMaxX where pixels[(y * width + x) * bpp + 3] > 0 {
        minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
      }
    }
    guard maxX >= minX, maxY >= minY else { continue }
    let boxWidth = maxX - minX + 1, boxHeight = maxY - minY + 1
    let scale = min(Double(targetCell - inset * 2) / Double(boxWidth), Double(targetCell - inset * 2) / Double(boxHeight))
    let drawWidth = max(1, Int((Double(boxWidth) * scale).rounded()))
    let drawHeight = max(1, Int((Double(boxHeight) * scale).rounded()))
    // The generated front reference includes asymmetric transparent padding
    // around its handlebar. Correct that source-specific optical center without
    // changing the already-approved left/right geometry.
    let verticalOpticalOffset = turnaroundMode
      ? (gridY == 0 ? 10 : gridY == 3 ? 5 : 0)
      : 0
    let destinationX = gridX * targetCell + (targetCell - drawWidth) / 2 + verticalOpticalOffset
    let destinationY = gridY * targetCell + targetCell - inset - drawHeight
    for dy in 0..<drawHeight {
      let sourceY = min(maxY, minY + dy * boxHeight / drawHeight)
      for dx in 0..<drawWidth {
        let sampledX = min(boxWidth - 1, dx * boxWidth / drawWidth)
        let sourceX = flipX ? maxX - sampledX : minX + sampledX
        let sourceIndex = (sourceY * width + sourceX) * bpp
        let destinationIndex = ((destinationY + dy) * outputSize + destinationX + dx) * bpp
        for channel in 0..<bpp { outputPixels[destinationIndex + channel] = pixels[sourceIndex + channel] }
      }
    }
  }
}

func alphaAt(_ x: Int, _ y: Int) -> UInt8 { outputPixels[(y * outputSize + x) * bpp + 3] }
func clearPixel(_ x: Int, _ y: Int) {
  let index = (y * outputSize + x) * bpp
  for channel in 0..<bpp { outputPixels[index + channel] = 0 }
}

// Remove tiny disconnected generation artifacts, then bottom-align again using
// the actual rider/bicycle component rather than those stray shadow pixels.
for gridY in 0..<grid {
  for gridX in 0..<grid {
    let cellMinX = gridX * targetCell, cellMinY = gridY * targetCell
    let cellMaxX = cellMinX + targetCell, cellMaxY = cellMinY + targetCell
    var visited = Set<Int>(), components = [[(Int, Int)]]()
    for y in cellMinY..<cellMaxY {
      for x in cellMinX..<cellMaxX where alphaAt(x, y) > 0 {
        let start = y * outputSize + x
        if visited.contains(start) { continue }
        var queue = [(x, y)], cursor = 0, component = [(Int, Int)](); visited.insert(start)
        while cursor < queue.count {
          let point = queue[cursor]; cursor += 1; component.append(point)
          for oy in -1...1 { for ox in -1...1 where ox != 0 || oy != 0 {
            let nx = point.0 + ox, ny = point.1 + oy
            if nx < cellMinX || nx >= cellMaxX || ny < cellMinY || ny >= cellMaxY || alphaAt(nx, ny) == 0 { continue }
            let key = ny * outputSize + nx
            if visited.insert(key).inserted { queue.append((nx, ny)) }
          }}
        }
        components.append(component)
      }
    }
    let largest = components.map(\.count).max() ?? 0
    for component in components where component.count < largest {
      for (x, y) in component { clearPixel(x, y) }
    }
    var actualMaxY = cellMinY
    for y in cellMinY..<cellMaxY { for x in cellMinX..<cellMaxX where alphaAt(x, y) > 0 { actualMaxY = max(actualMaxY, y) } }
    let baseline = cellMaxY - inset - 1, shift = max(0, baseline - actualMaxY)
    if shift > 0 {
      var cellCopy = [UInt8](repeating: 0, count: targetCell * targetCell * bpp)
      for y in cellMinY..<cellMaxY { for x in cellMinX..<cellMaxX {
        let sourceIndex = (y * outputSize + x) * bpp
        let localIndex = ((y - cellMinY) * targetCell + x - cellMinX) * bpp
        for channel in 0..<bpp { cellCopy[localIndex + channel] = outputPixels[sourceIndex + channel] }
        clearPixel(x, y)
      }}
      for localY in 0..<(targetCell - shift) { for localX in 0..<targetCell {
        let sourceIndex = (localY * targetCell + localX) * bpp
        guard cellCopy[sourceIndex + 3] > 0 else { continue }
        let destinationIndex = (((cellMinY + localY + shift) * outputSize) + cellMinX + localX) * bpp
        for channel in 0..<bpp { outputPixels[destinationIndex + channel] = cellCopy[sourceIndex + channel] }
      }}
    }
  }
}

// AI is only trusted to create the bicycle. The rider is composited from the
// canonical player sheet so hair, face, uniform and FPT badge stay pixel-exact
// in every direction. Column zero is deliberately repeated until a dedicated
// pedal animation is authored from this approved turnaround.
if let playerPath {
  let bicyclePixels = outputPixels
  let playerURL = URL(fileURLWithPath: playerPath)
  guard let playerSource = CGImageSourceCreateWithURL(playerURL as CFURL, nil),
        let playerImage = CGImageSourceCreateImageAtIndex(playerSource, 0, nil),
        playerImage.width == outputSize, playerImage.height == outputSize else {
    fputs("Player sprite sheet must be a decodable 128x128 PNG.\n", stderr)
    exit(1)
  }
  var playerPixels = [UInt8](repeating: 0, count: outputSize * outputSize * bpp)
  guard let playerContext = CGContext(data: &playerPixels, width: outputSize, height: outputSize,
                                      bitsPerComponent: 8, bytesPerRow: outputSize * bpp,
                                      space: colorSpace,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
  playerContext.interpolationQuality = .none
  playerContext.draw(playerImage, in: CGRect(x: 0, y: 0, width: outputSize, height: outputSize))

  for gridY in 0..<grid {
    let riderLift = (gridY == 1 || gridY == 2) ? -3 : -2
    for gridX in 0..<grid {
      for localY in 0..<targetCell {
        let destinationLocalY = localY + riderLift
        guard destinationLocalY >= 0, destinationLocalY < targetCell else { continue }
        for localX in 0..<targetCell {
          let playerIndex = (((gridY * targetCell + localY) * outputSize) + localX) * bpp
          guard playerPixels[playerIndex + 3] > 0 else { continue }
          let destinationX = gridX * targetCell + localX
          let destinationY = gridY * targetCell + destinationLocalY
          let destinationIndex = (destinationY * outputSize + destinationX) * bpp
          for channel in 0..<bpp { outputPixels[destinationIndex + channel] = playerPixels[playerIndex + channel] }
        }
      }

      // In front/back views, the rider and the bicycle occupy the same narrow
      // center line. Restore the lower fork/wheel in front of the rider's legs;
      // otherwise the exact player sprite hides half the bicycle and creates a
      // false horizontal offset. Side views already have correct occlusion.
      if gridY == 0 || gridY == 3 {
        for localY in 16..<targetCell {
          for localX in 0..<targetCell {
            let index = (((gridY * targetCell + localY) * outputSize) + gridX * targetCell + localX) * bpp
            guard bicyclePixels[index + 3] > 0 else { continue }
            for channel in 0..<bpp { outputPixels[index + channel] = bicyclePixels[index + channel] }
          }
        }
      }
    }
  }
}

guard let outputContext = CGContext(data: &outputPixels, width: outputSize, height: outputSize, bitsPerComponent: 8,
                                    bytesPerRow: outputSize * bpp, space: colorSpace,
                                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }

guard let outputImage = outputContext.makeImage(),
      let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(destination, outputImage, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
