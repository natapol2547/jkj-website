from fastapi import FastAPI

# Create the app instance
app = FastAPI()

# --- Endpoint 1: Simple Hello World ---
@app.get("/py/hello")
def hello_world():
    return {"message": "Hello from Python!"}