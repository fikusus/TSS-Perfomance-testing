# Dependencies
- [k6](https://k6.io/)
# Usage
Running in Single Thread Mode
```
k6 run -e HOSTNAME=<YOUR_HOSTNAME> test.js  
```
Running in multithreaded mode
```
k6 run -e HOSTNAME=<YOUR_HOSTNAME> -e TYPE=Multiple test.js  
```