import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count >= 3 else {
  fputs("Usage: prepare-character-spritesheet.swift INPUT OUTPUT [--eye-fix-only] [--turnaround] [--turnaround-offsets] [--generated-order] [--mirror-right] [--consistent-scale] [--safe-margin] [--lock-head] [--symmetric-front-eyes] [--head-source SHEET] [--player PLAYER_SHEET]\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let options = Array(CommandLine.arguments.dropFirst(3))
let eyeFixOnly = options.contains("--eye-fix-only")
let turnaroundMode = options.contains("--turnaround")
let turnaroundOffsets = options.contains("--turnaround-offsets")
let generatedOrder = options.contains("--generated-order")
let mirrorRight = options.contains("--mirror-right")
let consistentScale = options.contains("--consistent-scale")
let lockHead = options.contains("--lock-head")
let symmetricFrontEyes = options.contains("--symmetric-front-eyes")
let safeMargin = options.contains("--safe-margin")
let headSourcePath: String? = {
  guard let optionIndex = options.firstIndex(of: "--head-source"), options.indices.contains(optionIndex + 1) else { return nil }
  return options[optionIndex + 1]
}()
let playerPath: String? = {
  guard let optionIndex = options.firstIndex(of: "--player"), options.indices.contains(optionIndex + 1) else { return nil }
  return options[optionIndex + 1]
}()
if options.contains("--player") && playerPath == nil {
  fputs("--player requires a sprite-sheet path.\n", stderr)
  exit(2)
}
if options.contains("--head-source") && headSourcePath == nil {
  fputs("--head-source requires a 128x128 canonical sheet path.\n", stderr)
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

func writePNG(_ buffer: inout [UInt8], width: Int, height: Int, to url: URL) -> Bool {
  guard let context = CGContext(data: &buffer, width: width, height: height, bitsPerComponent: 8,
                                bytesPerRow: width * bpp, space: colorSpace,
                                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
        let outputImage = context.makeImage(),
        let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { return false }
  CGImageDestinationAddImage(destination, outputImage, nil)
  return CGImageDestinationFinalize(destination)
}

// Surgical repair for an already approved runtime sheet: preserve every byte
// except the right eye in the four down-facing frames. The right eye becomes
// an exact horizontal mirror of the approved left eye around face center x=16.
if eyeFixOnly {
  guard width == 128, height == 128 else {
    fputs("--eye-fix-only requires a 128x128 character sheet.\n", stderr)
    exit(1)
  }
  for frame in 0..<4 { for localY in 11...12 { for (leftX, rightX) in [(13, 19), (14, 18)] {
    let sourceIndex = ((localY * width) + frame * 32 + leftX) * bpp
    let destinationIndex = ((localY * width) + frame * 32 + rightX) * bpp
    for channel in 0..<bpp { pixels[destinationIndex + channel] = pixels[sourceIndex + channel] }
  }}}
  guard writePNG(&pixels, width: width, height: height, to: outputURL) else { exit(1) }
  exit(0)
}

// Generated sprite sheets sometimes contain a fake white/gray checkerboard.
// Flood-fill only the neutral background connected to the canvas edge. This
// preserves enclosed whites such as eyes, badges and bicycle highlights.
func isNeutralBackground(_ position: Int) -> Bool {
  let i = position * bpp
  let r = Int(pixels[i]), g = Int(pixels[i + 1]), b = Int(pixels[i + 2])
  return min(r, g, b) >= 185 && max(r, g, b) - min(r, g, b) <= 28
}
var backgroundVisited = [Bool](repeating: false, count: width * height)
var backgroundQueue = [Int](); backgroundQueue.reserveCapacity(width * height / 2)
func enqueueBackground(_ x: Int, _ y: Int) {
  guard x >= 0, y >= 0, x < width, y < height else { return }
  let position = y * width + x
  guard !backgroundVisited[position], isNeutralBackground(position) else { return }
  backgroundVisited[position] = true; backgroundQueue.append(position)
}
for x in 0..<width { enqueueBackground(x, 0); enqueueBackground(x, height - 1) }
for y in 0..<height { enqueueBackground(0, y); enqueueBackground(width - 1, y) }
var backgroundCursor = 0
while backgroundCursor < backgroundQueue.count {
  let position = backgroundQueue[backgroundCursor]; backgroundCursor += 1
  let x = position % width, y = position / width, i = position * bpp
  pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 0
  enqueueBackground(x - 1, y); enqueueBackground(x + 1, y)
  enqueueBackground(x, y - 1); enqueueBackground(x, y + 1)
}

let outputSize = 128, grid = 4, sourceGrid = turnaroundMode ? 2 : 4, targetCell = outputSize / grid
let inset = safeMargin ? 2 : 1
var outputPixels = [UInt8](repeating: 0, count: outputSize * outputSize * bpp)

func sourceCell(for targetRow: Int, column: Int) -> (x: Int, y: Int, flipX: Bool) {
  if turnaroundMode {
    let position = [(0, 0), (1, 0), (1, 0), (1, 1)][targetRow]
    return (position.0, position.1, targetRow == 2)
  }
  let canonicalRow = mirrorRight && targetRow == 2 ? 1 : targetRow
  // Imagegen commonly emits up, left, right, down. Runtime expects
  // down, left, right, up.
  let sourceRow = generatedOrder ? [3, 1, 2, 0][canonicalRow] : canonicalRow
  return (column, sourceRow, mirrorRight && targetRow == 2)
}

let sharedScale: Double? = {
  guard consistentScale, !turnaroundMode else { return nil }
  var widest = 1, tallest = 1
  for targetRow in 0..<grid { for column in 0..<grid {
    let cell = sourceCell(for: targetRow, column: column)
    let minY = cell.y * height / sourceGrid, maxY = (cell.y + 1) * height / sourceGrid
    let minX = cell.x * width / sourceGrid, maxX = (cell.x + 1) * width / sourceGrid
    var left = maxX, top = maxY, right = minX - 1, bottom = minY - 1
    for y in minY..<maxY { for x in minX..<maxX where pixels[(y * width + x) * bpp + 3] > 0 {
      left = min(left, x); right = max(right, x); top = min(top, y); bottom = max(bottom, y)
    }}
    if right >= left && bottom >= top {
      widest = max(widest, right - left + 1); tallest = max(tallest, bottom - top + 1)
    }
  }}
  return min(Double(targetCell - inset * 2) / Double(widest), Double(targetCell - inset * 2) / Double(tallest))
}()

// Normalize every frame independently. AI source sheets often leave unequal
// whitespace per direction; bottom-aligning each non-transparent bounding box
// prevents side-facing bicycle frames from floating above the tile baseline.
for gridY in 0..<grid {
  for gridX in 0..<grid {
    // Turnaround source: TL front, TR left, BL right (ignored), BR back.
    // Runtime row order: down, left, right, up. Right is a deterministic
    // mirror of the canonical left view so both sides remain pixel-consistent.
    let sourcePosition = sourceCell(for: gridY, column: gridX)
    let flipX = sourcePosition.flipX
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
    let scale = sharedScale ?? min(Double(targetCell - inset * 2) / Double(boxWidth), Double(targetCell - inset * 2) / Double(boxHeight))
    let drawWidth = max(1, Int((Double(boxWidth) * scale).rounded()))
    let drawHeight = max(1, Int((Double(boxHeight) * scale).rounded()))
    // The generated front reference includes asymmetric transparent padding
    // around its handlebar. Correct that source-specific optical center without
    // changing the already-approved left/right geometry.
    let verticalOpticalOffset = turnaroundMode && turnaroundOffsets
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

// Keep facial identity absolutely stable within each direction. Walk and pedal
// motion stays below the shoulders while the head is copied from frame zero.
if lockHead {
  let lockedRows = 17
  for gridY in 0..<grid { for gridX in 1..<grid {
    for localY in 0..<min(lockedRows, targetCell) { for localX in 0..<targetCell {
      let sourceIndex = (((gridY * targetCell + localY) * outputSize) + localX) * bpp
      let destinationIndex = (((gridY * targetCell + localY) * outputSize) + gridX * targetCell + localX) * bpp
      for channel in 0..<bpp { outputPixels[destinationIndex + channel] = outputPixels[sourceIndex + channel] }
    }}
  }}
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

if safeMargin {
  for gridY in 0..<grid { for gridX in 0..<grid {
    for localY in 0..<inset { for localX in 0..<targetCell {
      clearPixel(gridX * targetCell + localX, gridY * targetCell + localY)
    }}
  }}
}

// Replace only front/back heads with one approved canonical turnaround. Side
// rows remain byte-for-byte from the source animation. Copying transparent
// pixels too prevents the old flat hair silhouette from leaking around it.
if let headSourcePath {
  let headURL = URL(fileURLWithPath: headSourcePath)
  guard let headSource = CGImageSourceCreateWithURL(headURL as CFURL, nil),
        let headImage = CGImageSourceCreateImageAtIndex(headSource, 0, nil),
        headImage.width == outputSize, headImage.height == outputSize else {
    fputs("Canonical head source must be a decodable 128x128 PNG.\n", stderr)
    exit(1)
  }
  var headPixels = [UInt8](repeating: 0, count: outputSize * outputSize * bpp)
  guard let headContext = CGContext(data: &headPixels, width: outputSize, height: outputSize,
                                    bitsPerComponent: 8, bytesPerRow: outputSize * bpp,
                                    space: colorSpace,
                                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
  headContext.interpolationQuality = .none
  headContext.draw(headImage, in: CGRect(x: 0, y: 0, width: outputSize, height: outputSize))
  let headRows = 16
  for directionRow in [0, 3] { for frame in 0..<grid {
    for localY in 0..<headRows { for localX in 0..<targetCell {
      let sourceIndex = (((directionRow * targetCell + localY) * outputSize) + localX) * bpp
      let destinationIndex = (((directionRow * targetCell + localY) * outputSize) + frame * targetCell + localX) * bpp
      for channel in 0..<bpp { outputPixels[destinationIndex + channel] = headPixels[sourceIndex + channel] }
    }}
  }}
}

// Keep the approved left eye untouched and copy it to the right as an exact
// horizontal mirror. This runs after head replacement so player and NPC both
// receive the same correction without redrawing any other facial pixels.
if symmetricFrontEyes {
  for frame in 0..<grid {
    let frameX = frame * targetCell
    for localY in 11...12 {
      for (leftX, rightX) in [(13, 19), (14, 18)] {
        let sourceIndex = ((localY * outputSize) + frameX + leftX) * bpp
        let destinationIndex = ((localY * outputSize) + frameX + rightX) * bpp
        for channel in 0..<bpp { outputPixels[destinationIndex + channel] = outputPixels[sourceIndex + channel] }
      }
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

guard writePNG(&outputPixels, width: outputSize, height: outputSize, to: outputURL) else { exit(1) }
