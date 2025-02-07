#!/usr/bin/env node

const express = require('express')
const netApi = require('net-browserify')
const compression = require('compression')
const path = require('path')
const cors = require('cors')
const https = require('https')
const fs = require('fs')
let siModule
try {
  siModule = require('systeminformation')
} catch (err) { }

// Create our app
const app = express()

const isProd = process.argv.includes('--prod')
app.use(compression())
app.use(cors())
app.use(netApi({ allowOrigin: '*' }))
if (!isProd) {
  app.use('/sounds', express.static(path.join(__dirname, './generated/sounds/')))
}
// patch config
app.get('/config.json', (req, res, next) => {
  // read original file config
  let config = {}
  let publicConfig = {}
  try {
    config = require('./config.json')
  } catch {
    try {
      config = require('./dist/config.json')
    } catch { }
  }
  try {
    publicConfig = require('./public/config.json')
  } catch { }
  res.json({
    ...config,
    'defaultProxy': '', // use current url (this server)
    ...publicConfig,
  })
})
if (isProd) {
  // add headers to enable shared array buffer
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
    next()
  })

  // First serve from the override directory (volume mount)
  app.use(express.static(path.join(__dirname, './public')))

  // Then fallback to the original dist directory
  app.use(express.static(path.join(__dirname, './dist')))
}

const numArg = process.argv.find(x => x.match(/^\d+$/))
const port = (require.main === module ? numArg : undefined) || 8080

// Start the server
const server =
  app.listen(port, async function () {
    console.log('Proxy server listening on port ' + server.address().port)
    if (siModule && isProd) {
      const _interfaces = await siModule.networkInterfaces()
      const interfaces = Array.isArray(_interfaces) ? _interfaces : [_interfaces]
      let netInterface = interfaces.find(int => int.default)
      if (!netInterface) {
        netInterface = interfaces.find(int => !int.virtual) ?? interfaces[0]
        console.warn('Failed to get the default network interface, searching for fallback')
      }
      if (netInterface) {
        const address = netInterface.ip4
        console.log(`You can access the server on http://localhost:${port} or http://${address}:${port}`)
      }
    }
  })

module.exports = { app }


const multer = require('multer')
// Configure multer for zip file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'background')
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, 'iSavvy_Pack.zip')
  }
})

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/zip') {
      return cb(new Error('Only ZIP files are allowed'))
    }
    cb(null, true)
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
})

// Resource pack upload endpoint
app.get(`/${process.env.RESOURCE_PACK_UPLOAD_PATH || 'resource-pack-upload'}`, (req, res) => {
  res.send(/* html */`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Upload Resource Pack</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
          }
          .upload-form {
            border: 2px dashed #ccc;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
          }
          .upload-btn {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
          }
          #status {
            margin-top: 20px;
            padding: 10px;
            display: none;
          }
          .success { background: #e8f5e9; color: #2e7d32; }
          .error { background: #ffebee; color: #c62828; }
        </style>
      </head>
      <body>
        <div class="upload-form">
          <h2>Upload Resource Pack</h2>
          <form id="uploadForm">
            <input type="file" id="zipFile" accept=".zip" required>
            <br>
            <button type="submit" class="upload-btn">Upload</button>
          </form>
          <div id="status"></div>
        </div>
        <script>
          document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('zipFile');
            const status = document.getElementById('status');

            if (!fileInput.files[0]) {
              status.textContent = 'Please select a file';
              status.className = 'error';
              status.style.display = 'block';
              return;
            }

            const formData = new FormData();
            formData.append('resourcePack', fileInput.files[0]);

            try {
              const response = await fetch('/resource-pack-upload', {
                method: 'POST',
                body: formData
              });

              if (response.ok) {
                status.textContent = 'Resource pack uploaded successfully!';
                status.className = 'success';
              } else {
                const error = await response.text();
                status.textContent = 'Upload failed: ' + error;
                status.className = 'error';
              }
            } catch (error) {
              status.textContent = 'Upload failed: ' + error.message;
              status.className = 'error';
            }
            status.style.display = 'block';
          });
        </script>
      </body>
    </html>
  `)
})

app.post('/resource-pack-upload', upload.single('resourcePack'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded')
  }
  res.send('File uploaded successfully')
})
