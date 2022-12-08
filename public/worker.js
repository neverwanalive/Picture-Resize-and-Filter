const nearestNeighbor = (width, height, source, newWidth, newHeight) => {
  const dx = width / newWidth
  const dy = height / newHeight
  const dataSource = new Uint32Array(source)
  let out = new Uint32Array(newWidth * newHeight)

  for (let y = 0; y < newHeight; y++) {
    let srcY = Math.floor(y * dy)
    for (let x = 0; x < newWidth; x++) {
      let srcX = Math.floor(x * dx)
      out[y * newWidth + x] = dataSource[srcY * width + srcX]
    }
  }

  return out
}

function interpolate(a, b, c, d, width, height) {
  return (
    a * (1 - width) * (1 - height) +
    b * width * (1 - height) +
    c * (1 - width) * height +
    d * width * height
  )
}

function linearInterpolate(a, b, k) {
  return a + (b - a) * k
}

const bilinearInterpolation = (width, height, source, newWidth, newHeight) => {
  const xMax = width - 1
  const yMax = height - 1
  const src = new Uint32Array(source)
  let out = new Uint32Array(newWidth * newHeight)
  const dx = (xMax + 0.5) / newWidth
  const dy = (yMax + 0.5) / newHeight
  let dstOffset = 0
  for (let i = 0; i < newHeight; i++) {
    for (let j = 0; j < newWidth; j++) {
      const x = Math.floor(dx * j)
      const y = Math.floor(dy * i)
      const xDiff = dx * j - x
      const yDiff = dy * i - y
      const index = y * width + x

      const a = src[index]
      const b = x >= xMax ? a : src[index + 1]
      const c = y >= yMax ? a : src[index + width]
      const d = y >= yMax ? b : x >= xMax ? c : src[index + width + 1]

      const red = interpolate(
        a & 0xff,
        b & 0xff,
        c & 0xff,
        d & 0xff,
        xDiff,
        yDiff,
      )
      const green = interpolate(
        (a >> 8) & 0xff,
        (b >> 8) & 0xff,
        (c >> 8) & 0xff,
        (d >> 8) & 0xff,
        xDiff,
        yDiff,
      )
      const blue = interpolate(
        (a >> 16) & 0xff,
        (b >> 16) & 0xff,
        (c >> 16) & 0xff,
        (d >> 16) & 0xff,
        xDiff,
        yDiff,
      )
      const alpha = interpolate(
        (a >> 24) & 0xff,
        (b >> 24) & 0xff,
        (c >> 24) & 0xff,
        (d >> 24) & 0xff,
        xDiff,
        yDiff,
      )

      out[dstOffset++] = (alpha << 24) | (blue << 16) | (green << 8) | red
    }
  }
  return out
}

const kTimes = (width, height, source, newWidth, newHeight) => {
  const dx = width / newWidth
  const dy = height / newHeight
  const dataSource = new Uint32Array(source)
  let out = new Uint32Array(newWidth * newHeight)

  for (let srcY = 0; srcY < height; srcY++) {
    let y = Math.floor(srcY / dy)
    for (let srcX = 0; srcX < width; srcX++) {
      let x = Math.floor(srcX / dx)
      out[y * newWidth + x] = dataSource[srcY * width + srcX]
    }
  }

  if (newWidth > width) {
    for (let srcX = 0; srcX < width - 1; srcX++) {
      const outX = Math.floor(srcX / dx)
      const outXPair = Math.floor((srcX + 1) / dx)
      for (let srcY = 0; srcY < height; srcY++) {
        const outY = Math.floor(srcY / dy)
        const firstColor = dataSource[srcY * width + srcX]
        const secondColor = dataSource[srcY * width + srcX + 1]
        for (let x = outX + 1; x < outXPair; x++) {
          const dest = (x - outX) / (outXPair - outX)
          const red = linearInterpolate(
            firstColor & 0xff,
            secondColor & 0xff,
            dest,
          )
          const green = linearInterpolate(
            (firstColor >> 8) & 0xff,
            (secondColor >> 8) & 0xff,
            dest,
          )
          const blue = linearInterpolate(
            (firstColor >> 16) & 0xff,
            (secondColor >> 16) & 0xff,
            dest,
          )
          const alpha = linearInterpolate(
            (firstColor >> 24) & 0xff,
            (secondColor >> 24) & 0xff,
            dest,
          )
          out[outY * newWidth + x] =
            (alpha << 24) | (blue << 16) | (green << 8) | red
        }
      }
    }
  }

  if (newHeight > height) {
    for (let srcY = 0; srcY < height - 1; srcY++) {
      const outY = Math.floor(srcY / dy)
      const outYPair = Math.floor((srcY + 1) / dy)
      for (let outX = 0; outX < newWidth; outX++) {
        const firstColor = out[outY * newWidth + outX]
        const secondColor = out[outYPair * newWidth + outX]
        for (let y = outY + 1; y < outYPair; y++) {
          const dest = (y - outY) / (outYPair - outY)
          const red = linearInterpolate(
            firstColor & 0xff,
            secondColor & 0xff,
            dest,
          )
          const green = linearInterpolate(
            (firstColor >> 8) & 0xff,
            (secondColor >> 8) & 0xff,
            dest,
          )
          const blue = linearInterpolate(
            (firstColor >> 16) & 0xff,
            (secondColor >> 16) & 0xff,
            dest,
          )
          const alpha = linearInterpolate(
            (firstColor >> 24) & 0xff,
            (secondColor >> 24) & 0xff,
            dest,
          )
          out[y * newWidth + outX] =
            (alpha << 24) | (blue << 16) | (green << 8) | red
        }
      }
    }
  }

  return out
}

const rotatePoint = (angle, x, y) => {
  const newX = x * Math.cos(angle) - y * Math.sin(angle)
  const newY = x * Math.sin(angle) + y * Math.cos(angle)

  return [newX, newY]
}

const rotate = (width, height, source, angle) => {
  const angleRad = (angle / 180) * Math.PI
  const diagonalLength = 0.5 * Math.sqrt(width * width + height * height)

  const diagonalAngle = Math.atan2(height, width)
  const newWidth = Math.floor(
    2 *
      diagonalLength *
      Math.max(
        Math.abs(Math.cos(angleRad + diagonalAngle)),
        Math.abs(Math.cos(angleRad - diagonalAngle)),
      ),
  )

  const newHeight = Math.floor(
    2 *
      diagonalLength *
      Math.max(
        Math.abs(Math.sin(angleRad + diagonalAngle)),
        Math.abs(Math.sin(angleRad - diagonalAngle)),
      ),
  )

  const src = new Uint32Array(source)
  let out = new Uint32Array(newWidth * newHeight)

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      let [rotatedX, rotatedY] = rotatePoint(
        -angleRad,
        x - newWidth / 2,
        y - newHeight / 2,
      )
      rotatedX = Math.floor(rotatedX + width / 2)
      rotatedY = Math.floor(rotatedY + height / 2)
      if (
        rotatedX < 0 ||
        rotatedX >= width ||
        rotatedY < 0 ||
        rotatedY >= height
      ) {
        out[y * newWidth + x] = 0
      } else {
        out[y * newWidth + x] = src[Math.floor(rotatedY * width + rotatedX)]
      }
    }
  }

  return [out, newWidth, newHeight]
}

const mapBuffer = (buffer, width, height, cb, out) => {
  const aroundIndexes = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [0, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + x] = cb(
        aroundIndexes.map(([_x, _y]) => {
          return buffer[(y + _y) * width + x + _x] || 0xffffffff
        }),
      )
    }
  }
}

const getBrightness = color => {
  return (
    (color & 0xff) +
    ((color >> 8) & 0xff) +
    ((color >> 16) & 0xff) +
    ((color >> 24) & 0xff)
  )
}

const medianFilter = (width, height, source) => {
  const out = new Uint32Array(width * height)
  const src = new Uint32Array(source)

  mapBuffer(
    src,
    width,
    height,
    points => {
      return points.sort((a, b) => getBrightness(a) - getBrightness(b))[
        Math.floor(points.length / 2)
      ]
    },
    out,
  )
  return out
}

const convolutionFilter = (width, height, source, matrix) => {
  const out = new Uint32Array(width * height)
  const src = new Uint32Array(source)

  const colorsOffsets = [24, 16, 8, 0]

  const matrixCore = matrix.reduce(
    (acc, row) => acc + row.reduce((acc, num) => acc + num, 0),
    0,
  )

  mapBuffer(
    src,
    width,
    height,
    points => {
      return colorsOffsets.reduce((acc, offset) => {
        return (
          (acc << 8) +
          Math.max(
            0,
            Math.min(
              points
                .map(point => (point >> offset) & 0xff)
                .reduce(
                  (acc, color, idx) =>
                    acc + color * matrix[Math.floor(idx / 3)][idx % 3],
                  0,
                ) / matrixCore,
              255,
            ),
          )
        )
      }, 0)
    },
    out,
  )

  return out
}

onmessage = ({ data: [functionId, ...params] }) => {
  let result
  switch (functionId) {
    case 1:
      result = nearestNeighbor(...params)
      break
    case 2:
      result = bilinearInterpolation(...params)
      break
    case 3:
      result = kTimes(...params)
      break
    case 4:
      result = rotate(...params)
      break
    case 5:
      result = medianFilter(...params)
      break
    case 6:
      result = convolutionFilter(...params)
      break
    default:
      result = null
  }
  postMessage(result)
}
