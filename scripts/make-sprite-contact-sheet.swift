import AppKit
import Foundation

guard CommandLine.arguments.count >= 3 else {
  fputs("Usage: make-sprite-contact-sheet.swift OUTPUT.PNG id:label ...\n", stderr)
  exit(2)
}

let outputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let entries = CommandLine.arguments.dropFirst(2).compactMap { value -> (String, String)? in
  guard let separator = value.firstIndex(of: ":") else { return nil }
  return (String(value[..<separator]), String(value[value.index(after: separator)...]))
}

let columns = 10
let cellWidth = 148
let cellHeight = 176
let rows = Int(ceil(Double(entries.count) / Double(columns)))
let canvasSize = NSSize(width: columns * cellWidth, height: rows * cellHeight)
let image = NSImage(size: canvasSize)

image.lockFocus()
NSColor(calibratedRed: 0.055, green: 0.095, blue: 0.125, alpha: 1).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: canvasSize)).fill()

let titleStyle: [NSAttributedString.Key: Any] = [
  .font: NSFont.monospacedSystemFont(ofSize: 14, weight: .semibold),
  .foregroundColor: NSColor.white,
]

for (index, entry) in entries.enumerated() {
  let column = index % columns
  let row = index / columns
  let x = column * cellWidth
  let y = Int(canvasSize.height) - (row + 1) * cellHeight
  let cellRect = NSRect(x: x + 4, y: y + 4, width: cellWidth - 8, height: cellHeight - 8)
  NSColor(calibratedWhite: row.isMultiple(of: 2) ? 0.10 : 0.13, alpha: 1).setFill()
  NSBezierPath(roundedRect: cellRect, xRadius: 6, yRadius: 6).fill()

  let spriteURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("assets/monsters/\(entry.0)/sprite.png")
  if let sprite = NSImage(contentsOf: spriteURL) {
    sprite.draw(in: NSRect(x: x + 12, y: y + 32, width: 124, height: 124),
                from: .zero, operation: .sourceOver, fraction: 1,
                respectFlipped: true, hints: [.interpolation: NSImageInterpolation.none])
  }

  let title = "\(index + 1). \(entry.1)  \(entry.0)" as NSString
  title.draw(in: NSRect(x: x + 10, y: y + 10, width: cellWidth - 20, height: 20), withAttributes: titleStyle)
}

image.unlockFocus()
guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
  fputs("Cannot encode contact sheet.\n", stderr)
  exit(1)
}
try png.write(to: outputURL)
print("Wrote \(outputURL.path) with \(entries.count) sprites.")
