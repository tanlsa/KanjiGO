import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count >= 3 else {
  fputs("Usage: polish-up-facing-sprites.swift BICYCLE.png CHARACTER.png...\n", stderr)
  exit(2)
}

let size = 512, cell = 128, bytesPerPixel = 4, bytesPerRow = size * bytesPerPixel
let colorSpace = CGColorSpaceCreateDeviceRGB()

func editPNG(at path: String, edit: (inout [UInt8]) -> Void) {
  let url = URL(fileURLWithPath: path)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
        image.width == size, image.height == size else {
    fputs("Expected a 512x512 RGBA spritesheet: \(path)\n", stderr)
    exit(1)
  }

  var pixels = [UInt8](repeating: 0, count: size * bytesPerRow)
  guard let decode = CGContext(data: &pixels, width: size, height: size, bitsPerComponent: 8,
                               bytesPerRow: bytesPerRow, space: colorSpace,
                               bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
  decode.interpolationQuality = .none
  decode.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
  edit(&pixels)

  guard let encode = CGContext(data: &pixels, width: size, height: size, bitsPerComponent: 8,
                               bytesPerRow: bytesPerRow, space: colorSpace,
                               bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
        let output = encode.makeImage(),
        let destination = CGImageDestinationCreateWithURL(
          url as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(1) }
  CGImageDestinationAddImage(destination, output, nil)
  guard CGImageDestinationFinalize(destination) else { exit(1) }
}

func pixelOffset(x: Int, y: Int) -> Int { (y * size + x) * bytesPerPixel }

let bicyclePath = CommandLine.arguments[1]
editPNG(at: bicyclePath) { pixels in
  // In the rear view the rider sits in front of the steering assembly. A wide
  // horizontal bar reads as a second handlebar across the rider's back, so the
  // overlay begins at the centered stem instead.
  for frame in 0..<4 {
    for localY in 26...35 {
      for localX in 36...91 {
        let offset = pixelOffset(x: frame * cell + localX, y: 3 * cell + localY)
        pixels[offset] = 0; pixels[offset + 1] = 0; pixels[offset + 2] = 0; pixels[offset + 3] = 0
      }
    }
  }
}
print("\(bicyclePath): removed rear-view handlebar band")

for characterPath in CommandLine.arguments.dropFirst(2) {
  editPNG(at: characterPath) { pixels in
    for frame in 0..<4 {
      let originX = frame * cell, originY = 3 * cell

      func copyHairPixel(fromX: Int, fromY: Int, toX: Int, toY: Int) {
        let source = pixelOffset(x: originX + fromX, y: originY + fromY)
        let target = pixelOffset(x: originX + toX, y: originY + toY)
        pixels[target] = pixels[source]
        pixels[target + 1] = pixels[source + 1]
        pixels[target + 2] = pixels[source + 2]
        pixels[target + 3] = pixels[source + 3]
      }

      // Three tapered, runtime-grid-aligned nape locks replace the visually
      // flat hair/shirt seam. Source pixels come from the existing hair so the
      // palette and highlights remain identical for every appearance.
      let locks = [
        (sourceX: 48, targetX: 52, width: 4),
        (sourceX: 60, targetX: 62, width: 4),
        (sourceX: 76, targetX: 72, width: 4),
      ]
      for lock in locks {
        for dy in 0..<8 {
          let inset = dy >= 4 ? 1 : 0
          for dx in inset..<(lock.width - inset) {
            copyHairPixel(fromX: lock.sourceX + min(dx, 3), fromY: 48 + min(dy, 7),
                          toX: lock.targetX + dx, toY: 56 + dy)
          }
        }
      }
    }
  }
  print("\(characterPath): tapered rear-view nape silhouette")
}
