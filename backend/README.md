# Backend API - Signal Processing & SVM Classification

FastAPI-based backend for signal processing using wavelet decomposition, FFT analysis, statistical feature extraction, and SVM classification.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Running Options](#running-options)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Features

### Signal Processing
- **Wavelet Decomposition**: Multi-level signal decomposition using PyWavelets
- **FFT Analysis**: Fast Fourier Transform for frequency domain analysis
- **Statistical Features**: Skewness, kurtosis, entropy, MSE, SNR, RMSE
- **LTTB Downsampling**: Intelligent downsampling for large datasets (830k+ points → 15k points)
- **Multiple File Formats**: `.txt`, `.lvm`, `.csv`, `.xlsx` (with gzip compression support)

### SVM Classification
- **Multi-kernel Support**: RBF, Linear, Polynomial, Sigmoid kernels
- **Grid Search**: Hyperparameter optimization with cross-validation
- **Performance Metrics**: AUC, accuracy, precision, recall, F1-score
- **Visualizations**: ROC curves, confusion matrices, decision boundaries
- **Model Persistence**: Save and load trained models for predictions

### Performance Optimizations
- **File Caching**: Avoid re-uploading files with unique `file_id`
- **Parallel Processing**: Multi-core support for SVM training
- **Memory Optimization**: 2GB kernel cache per SVM (optimized for 24GB RAM servers)
- **Gzip Compression**: 50-90% bandwidth reduction for file uploads

---

## Prerequisites

### Required
- **Python**: 3.11 or higher
- **pip**: Python package manager

### Optional
- **Docker**: For containerized deployment
- **Docker Compose**: For production deployment with Traefik

### System Requirements
- **CPU**: 4+ cores recommended (multi-core support for parallel processing)
- **RAM**: 8GB minimum, 24GB recommended for large SVM training
- **Disk**: 1GB free space for caching and model storage

---

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Dop-Project/backend
```

### 2. Create Virtual Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Test the API
```bash
# Check if server is running
curl http://localhost:8000

# Expected response:
# {"message": "Feature Extraction API", "status": "healthy"}
```

The API is now running at: **http://localhost:8000**

API Documentation (interactive): **http://localhost:8000/docs**

---

## Running Options

### Option 1: Development Mode (with auto-reload)
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- **Auto-reload**: Code changes automatically restart the server
- **Host**: `0.0.0.0` (accessible from other devices on network)
- **Port**: `8000`
- **Best for**: Local development

### Option 2: Production Mode (single worker)
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```
- **No auto-reload**: Stable for production
- **Single worker**: Good for testing
- **Best for**: Small deployments

### Option 3: Production Mode (multi-worker)
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```
- **4 workers**: Utilizes multi-core CPU (adjust based on your CPU cores)
- **Best for**: Production with high traffic

### Option 4: Docker (containerized)
```bash
# Build Docker image
docker build -t backend-api .

# Run container
docker run -d -p 8000:8000 --name backend-api backend-api
```
- **Isolated environment**: Consistent across systems
- **Port mapping**: Container port 8000 → Host port 8000
- **Best for**: Production deployment

### Option 5: Docker Compose (with Traefik)
```bash
# Start with Traefik reverse proxy
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```
- **Includes**: Traefik reverse proxy, SSL, CORS, rate limiting
- **Production domain**: `api.sibilytics-ai.in`
- **Best for**: Production with custom domain

---

## API Documentation

### Interactive Documentation
Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main Endpoints

#### 1. Health Check
```bash
GET /
```

#### 2. Signal Processing

**Upload File**
```bash
POST /api/upload-with-progress
```
- Uploads file and returns `file_id` for caching
- Supports gzip compression
- File formats: `.txt`, `.lvm`, `.csv`, `.xlsx`

**Process Signal**
```bash
POST /api/process
```
- Full wavelet decomposition and feature extraction
- Returns statistical metrics, plots, and reconstructed signals

**Batch Plots**
```bash
POST /api/plots/batch
```
- Generate multiple plots in one request
- Uses cached `file_id` to avoid re-upload

#### 3. SVM Classification

**Upload Dataset**
```bash
POST /api/svm/upload-dataset
```
- Upload CSV/Excel for SVM training
- Returns column names and preview

**Train SVM Model**
```bash
POST /api/svm/train
```
- Train SVM with multiple kernels
- Grid search for hyperparameter optimization
- Returns metrics, plots, and model ID

**Predict**
```bash
POST /api/svm/predict
```
- Use trained model for predictions
- Returns class prediction and probabilities

**Download Results**
```bash
POST /api/svm/download-results
```
- Export training results to Excel

### Detailed API Documentation
See: [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)

---

## Development

### Project Structure
```
backend/
├── main.py                  # FastAPI application
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker container config
├── docker-compose.yml      # Production deployment config
├── API_DOCUMENTATION.md    # Detailed API docs
├── test_api.py            # API tests
├── test_optimization.py   # Performance tests
└── README.md              # This file
```

### Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.115.0 | Web framework |
| uvicorn | 0.34.0 | ASGI server |
| pandas | 2.2.3 | Data manipulation |
| numpy | 2.1.3 | Numerical operations |
| scikit-learn | 1.5.2 | SVM and ML algorithms |
| PyWavelets | 1.7.0 | Wavelet transforms |
| scipy | 1.14.1 | Scientific computing |
| matplotlib | 3.9.2 | Plotting |
| seaborn | 0.13.2 | Statistical visualization |
| plotly | 5.24.1 | Interactive plots |
| openpyxl | 3.1.2 | Excel file support |

### Environment Variables
```bash
# Optional: Set environment
ENV=production  # or 'development'
```

### File Storage Locations
- **Upload cache**: `/tmp/upload_cache/`
- **SVM models**: `/tmp/svm_models/`

These directories are created automatically on startup.

### CORS Configuration
Default allowed origins (configured in `main.py:195-201`):
```python
allow_origins=[
    "http://localhost:3000",      # Next.js dev
    "http://localhost:3001",      # Alternative dev port
    "https://sibilytics-ai.in",
    "https://www.sibilytics-ai.in",
    "https://app.sibilytics-ai.in",
]
```

To add more origins, edit `main.py` line 195.

### Adding New Dependencies
```bash
# Install new package
pip install package-name

# Update requirements.txt
pip freeze > requirements.txt
```

### Running Tests
```bash
# Test API endpoints
python test_api.py

# Test optimization features
python test_optimization.py
```

---

## Production Deployment

### Oracle ARM Server (4 cores, 24GB RAM)

#### Recommended Configuration
```bash
uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --timeout-keep-alive 75 \
  --limit-concurrency 1000 \
  --limit-max-requests 10000 \
  --backlog 2048
```

#### Using Docker Compose (Recommended)
```bash
# Update docker-compose.yml with your domain
# Change: traefik.http.routers.backend.rule=Host(`api.your-domain.com`)

# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Restart
docker-compose restart backend

# Stop
docker-compose down
```

#### Using systemd (Linux)
Create `/etc/systemd/system/backend-api.service`:
```ini
[Unit]
Description=Backend API Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Dop-Project/backend
Environment="PATH=/path/to/Dop-Project/backend/venv/bin"
ExecStart=/path/to/Dop-Project/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable backend-api
sudo systemctl start backend-api
sudo systemctl status backend-api
```

### Monitoring

#### Check Server Status
```bash
# Using curl
curl http://localhost:8000

# Check logs (Docker)
docker logs backend-api -f

# Check logs (systemd)
sudo journalctl -u backend-api -f
```

#### Performance Monitoring
```bash
# CPU and memory usage
docker stats backend-api

# Or with htop/top
htop
```

---

## Troubleshooting

### Server won't start

**Issue**: `Address already in use`
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
uvicorn main:app --port 8001
```

**Issue**: `Module not found`
```bash
# Reinstall dependencies
pip install -r requirements.txt

# Or use virtual environment
source venv/bin/activate
pip install -r requirements.txt
```

### Slow SVM Training

**Solution 1**: Reduce hyperparameter grid
```bash
# In API request, use fewer values:
c_values="1,10,100"           # Instead of 9 values
gamma_values="0.01,0.1,1"    # Instead of 5 values
kernels="rbf,linear"          # Instead of 4 kernels
```

**Solution 2**: Use single test size
```bash
test_sizes="0.2"  # Instead of "0.2,0.3"
```

**Solution 3**: Sample large datasets
```python
# In your preprocessing code
df = df.sample(n=10000, random_state=42)
```

See [`SVM_OPTIMIZATION_TIPS.md`](../SVM_OPTIMIZATION_TIPS.md) for more details.

### CORS Errors

**Issue**: Frontend can't access API

**Solution**: Add frontend origin to CORS config
```python
# Edit main.py line 195-201
allow_origins=[
    "http://localhost:3000",
    "http://your-frontend-domain.com",  # Add this
]
```

Restart server after changes.

### Large File Upload Fails

**Issue**: File upload times out or fails

**Solution 1**: Use gzip compression
```javascript
// Frontend: Compress before upload
const compressedFile = await compressFile(file);
```

**Solution 2**: Increase timeout
```bash
uvicorn main:app --timeout-keep-alive 120  # 2 minutes
```

**Solution 3**: Check Traefik config (if using)
```yaml
# docker-compose.yml
- "traefik.http.middlewares.backend-sizelimit.buffering.maxRequestBodyBytes=0"  # Unlimited
```

### Memory Issues

**Issue**: Server crashes or runs out of memory

**Solution 1**: Reduce SVM cache size
```python
# Edit main.py line 1568
cache_size=1000  # Reduce from 2000 to 1000 (1GB)
```

**Solution 2**: Use fewer workers
```bash
uvicorn main:app --workers 2  # Instead of 4
```

**Solution 3**: Limit concurrent requests
```bash
uvicorn main:app --limit-concurrency 100  # Instead of 1000
```

### Docker Issues

**Issue**: Container won't start
```bash
# Check logs
docker logs backend-api

# Rebuild image
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Issue**: Can't access from host
```bash
# Check port mapping
docker ps

# Should show: 0.0.0.0:8000->8000/tcp
# If not, check docker-compose.yml or docker run command
```

---

## API Rate Limits

### Default Limits (configured in docker-compose.yml)
- **Average**: 100 requests/second
- **Burst**: 500 requests in 1 second
- **Period**: 1 second

To modify, edit `docker-compose.yml` lines 51-53.

---

## Security

### Production Checklist
- [ ] Change default CORS origins
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure firewall (only allow port 8000/443)
- [ ] Set up rate limiting
- [ ] Enable logging and monitoring
- [ ] Regular dependency updates: `pip install --upgrade -r requirements.txt`
- [ ] Secure `/tmp/` directories with proper permissions
- [ ] Use environment variables for sensitive configs

---

## Performance Tips

### For Oracle ARM Server (4 cores, 24GB RAM)

**Optimal Settings**:
```bash
# Workers: Number of CPU cores
--workers 4

# Connections: 250-500 per worker
--limit-concurrency 1000

# Memory: 2GB cache per SVM (safe for 24GB RAM)
# Already configured in main.py:1568
```

**SVM Training**:
- Use reduced hyperparameter grid for faster training
- Sample large datasets (>100k rows) to 10-50k samples
- Use 2 kernels instead of 4 for quick iterations
- Single test size for development

**File Processing**:
- Always use gzip compression for files >5MB
- Use file caching with `file_id` to avoid re-uploads
- LTTB downsampling reduces 830k points to 15k automatically

---

## License

[Your License Here]

---

## Support

For issues, questions, or contributions:
- **Issues**: Create an issue in the repository
- **Documentation**: See `API_DOCUMENTATION.md`
- **Contact**: [Your contact info]

---

**Last Updated**: November 16, 2025
**Version**: 1.0.0
**Python Version**: 3.11+
**FastAPI Version**: 0.115.0
