import { Button, Container, Grid, MenuItem, TextField } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { Box } from '@mui/system'
import { useState, useEffect, createRef } from 'react'

const MAX_SIZE = 900
const DEFAULT_SIZE = 400

const defaultMatrix = [
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
]

var worker = new Worker('worker.js')

function App() {
  const [ctx, setCtx] = useState(null)
  const [scaleSize, setScaleSize] = useState({
    px: DEFAULT_SIZE,
    k: 1,
  })
  const [scaleType, setScaleType] = useState(1)
  const [matrix, setMatrix] = useState(defaultMatrix)
  const [rotate, setRotate] = useState(0)
  const fileInputRef = createRef()

  const [loadings, setLoadings] = useState({ scale: false, rotate: false })
  const [timings, setTimings] = useState({ scale: null, rotate: null })

  useEffect(() => {
    const image = new Image()
    image.src = '/img1.jpg'
    image.onload = () => {
      ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx?.drawImage(image, 0, 0)
    }
  }, [ctx])

  const handleChooseFile = e => {
    if (e.target.files && e.target.files[0]) {
      const image = new Image()
      image.src = URL.createObjectURL(e.target.files[0])
      image.onload = () => {
        setScaleSize({ px: image.width, k: 1 })
        ctx.canvas.width = image.width
        ctx.canvas.height = image.height
        ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        ctx?.drawImage(image, 0, 0)
      }
    }
  }

  const handleSizeChange = (value, isK) => {
    if (isK) {
      setScaleSize({
        px: ctx.canvas.width * value,
        k: value,
      })
      return
    }
    setScaleSize({
      px: value,
      k: value / ctx.canvas.width,
    })
  }

  const handleFileSave = () => {
    let link = document.createElement('a')
    link.download = 'image.png'
    link.href = ctx.canvas.toDataURL()
    link.click()
  }

  const handleScaleApply = () => {
    const time = Date.now()
    const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    setScaleSize(prev => ({ ...prev, k: 1 }))
    setLoadings(prev => ({ ...prev, scale: true }))

    worker.postMessage([
      scaleType,
      img.width,
      img.height,
      img.data.buffer,
      scaleSize.px,
      scaleSize.px,
    ])

    worker.onmessage = ({ data }) => {
      const pixels = new Uint8ClampedArray(data.buffer)
      ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.canvas.width = scaleSize.px
      ctx.canvas.height = scaleSize.px
      const imageData = new ImageData(pixels, scaleSize.px, scaleSize.px)
      ctx.putImageData(imageData, 0, 0)
      setTimings(prev => ({ ...prev, scale: Date.now() - time }))
      setLoadings(prev => ({ ...prev, scale: false }))
    }
  }
  const handleMedianFilter = () => {
    const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    worker.postMessage([5, img.width, img.height, img.data.buffer])

    worker.onmessage = ({ data }) => {
      const pixels = new Uint8ClampedArray(data.buffer)
      ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      const imageData = new ImageData(
        pixels,
        ctx.canvas.width,
        ctx.canvas.height,
      )
      ctx.putImageData(imageData, 0, 0)
    }
  }

  const handleConvolutionFilter = () => {
    const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    worker.postMessage([6, img.width, img.height, img.data.buffer, matrix])

    worker.onmessage = ({ data }) => {
      const pixels = new Uint8ClampedArray(data.buffer)
      ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      const imageData = new ImageData(
        pixels,
        ctx.canvas.width,
        ctx.canvas.height,
      )
      ctx.putImageData(imageData, 0, 0)
    }
  }

  const handleRotateApply = () => {
    const time = Date.now()
    const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    setScaleSize(prev => ({ ...prev, k: 1 }))
    setLoadings(prev => ({ ...prev, rotate: true }))

    worker.postMessage([4, img.width, img.height, img.data.buffer, rotate])

    worker.onmessage = ({ data: [data, newWidth, newHeight] }) => {
      const pixels = new Uint8ClampedArray(data.buffer)
      ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.canvas.width = newWidth
      ctx.canvas.height = newHeight
      const imageData = new ImageData(pixels, newWidth, newHeight)
      ctx.putImageData(imageData, 0, 0)
      setTimings(prev => ({ ...prev, rotate: Date.now() - time }))
      setLoadings(prev => ({ ...prev, rotate: false }))
    }
  }

  return (
    <div style={{ height: '100vh', margin: '-8px' }}>
      <Container style={{ maxWidth: '1920px' }}>
        <Grid style={{ display: 'flex' }}>
          <Grid
            style={{
              width: '50%',
              jalignItems: 'end',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                width: `${MAX_SIZE}px`,
                height: `${MAX_SIZE}px`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <canvas
                ref={ref => setCtx(ref?.getContext('2d'))}
                id='canvas'
                width={DEFAULT_SIZE}
                height={DEFAULT_SIZE}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: '8px' }}>
              <Button
                variant='contained'
                onClick={() => fileInputRef.current.click()}
              >
                Choose file
              </Button>

              <Button
                variant='contained'
                color='success'
                onClick={handleFileSave}
              >
                Save file
              </Button>
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleChooseFile}
                style={{ visibility: 'hidden' }}
              />
            </Box>
          </Grid>
          <Grid
            item
            xs={2}
            style={{
              padding: '35px 0 50px 50px',
              width: '50%',
              alignItems: 'end',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box style={{ width: '300px' }}>
              <Box sx={{ fontSize: '20px', mb: '24px', fontWeight: 600 }}>
                Scale
              </Box>
              <Box mb='24px'>
                <TextField
                  select
                  value={scaleType}
                  label='Scale type'
                  onChange={e => setScaleType(e.target.value)}
                >
                  <MenuItem value={1}>Nearest neighbor</MenuItem>
                  <MenuItem value={2}>Bilinear interpolation</MenuItem>
                  <MenuItem value={3}>K-times</MenuItem>
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <TextField
                  size='small'
                  label='Width'
                  variant='outlined'
                  type='number'
                  InputProps={{ inputProps: { min: 1, max: MAX_SIZE } }}
                  value={scaleSize.px}
                  onChange={e => handleSizeChange(Number(e.target.value))}
                />
                <Box>X</Box>
                <TextField
                  size='small'
                  label='Height'
                  variant='outlined'
                  type='number'
                  InputProps={{ inputProps: { min: 1, max: MAX_SIZE } }}
                  onChange={e => handleSizeChange(Number(e.target.value))}
                  value={scaleSize.px}
                />
              </Box>

              <Box mt='24px'>
                <TextField
                  size='small'
                  label='K'
                  variant='outlined'
                  type='number'
                  InputProps={{
                    inputProps: {
                      step: 0.1,
                      min: 0.1,
                      max: ctx?.canvas?.width
                        ? MAX_SIZE / ctx?.canvas?.width
                        : MAX_SIZE,
                    },
                  }}
                  value={scaleSize.k}
                  onChange={e => handleSizeChange(Number(e.target.value), true)}
                />
              </Box>

              <Box sx={{ mt: '24px' }}>
                <LoadingButton
                  variant='contained'
                  onClick={handleScaleApply}
                  loading={loadings.scale}
                >
                  Scale
                </LoadingButton>
                <Box component='span' ml='16px' sx={{ fontSize: '14px' }}>
                  {timings.scale || 0} ms
                </Box>
              </Box>
              <Box
                sx={{ fontSize: '20px', m: '32px 0 24px 0', fontWeight: 600 }}
              >
                Rotate
              </Box>
              <Box mb='24px'>
                <TextField
                  size='small'
                  label='Rotate deg'
                  variant='outlined'
                  type='number'
                  InputProps={{
                    inputProps: {
                      step: 0.1,
                      min: -360,
                      max: 360,
                    },
                  }}
                  value={rotate}
                  onChange={e => setRotate(Number(e.target.value))}
                />
              </Box>
              <LoadingButton
                variant='contained'
                onClick={handleRotateApply}
                loading={loadings.rotate}
              >
                Rotate
              </LoadingButton>
              <Box component='span' ml='16px' sx={{ fontSize: '14px' }}>
                {timings.rotate || 0} ms
              </Box>
              <Box
                sx={{ fontSize: '20px', m: '32px 0 24px 0', fontWeight: 600 }}
              >
                Median filter
              </Box>
              <LoadingButton
                variant='contained'
                onClick={handleMedianFilter}
                loading={loadings.rotate}
              >
                Apply
              </LoadingButton>
              <Box
                sx={{ fontSize: '20px', m: '32px 0 24px 0', fontWeight: 600 }}
              >
                Convolution filter
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                {matrix.map((row, idx1) => {
                  return row.map((num, idx2) => {
                    return (
                      <TextField
                        size='small'
                        style={{ maxWidth: '30%' }}
                        key={`${idx1}_${idx2}`}
                        type='number'
                        value={num}
                        onChange={e => {
                          setMatrix(
                            matrix.map((row, _idx1) => {
                              return row.map((n, _idx2) => {
                                if (idx1 === _idx1 && idx2 === _idx2) {
                                  return Number(e.target.value)
                                }
                                return n
                              })
                            }),
                          )
                        }}
                        InputProps={{
                          inputProps: {
                            min: -10,
                            max: 10,
                          },
                        }}
                      />
                    )
                  })
                })}
              </Box>
              <LoadingButton
                variant='contained'
                style={{ marginTop: '24px' }}
                onClick={handleConvolutionFilter}
              >
                Apply
              </LoadingButton>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </div>
  )
}

export default App
