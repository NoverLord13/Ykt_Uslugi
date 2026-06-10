from fastapi import FastAPI
import uvicorn


app = FastAPI()

@app.get("/")
def read_root():
    return "eshkere"


if __name__== "__main__":
    uvicorn.run("main:app", reload=True)