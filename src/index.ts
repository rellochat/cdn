import bodyParser from "body-parser";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
const app = express();

dotenv.config();

app.use(bodyParser.json());

const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.get("Authorization")) return res.status(401).json({ error: "Access Denied" });
    fetch(`${process.env.API_URL}/auth`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": req.get("Authorization")?.toString()!
        }
    }).then(async (response) => {
        const data = await response.json();
        if (data.user) {
            (req as any).user = data.user;
            next();
        } else return res.status(401).json({ error: "Access Denied" });
    })
}

const sendImage = (res: Response, id: string, path: string) => {
    if (fs.existsSync(`public/${path}/${id}`)) {
        fs.readFile(`public/${path}/${id}`, (err, data) => {
            res.type(id.split(".")[1]);
            return res.status(200).send(data);
        })
    } else return res.status(404).json({ error: "Resource not found." })
}

const uploadImage = (res: Response, id: string, path: string, data: any) => {
    console.log(id, path, data);
    fs.writeFile(`public/${path}/${id}`, Buffer.from(data, "base64"), (err) => {
        sendImage(res, id, path);
    });
}

app.get("/avatar/:id", (req, res) => {
    sendImage(res, req.params.id, "avatar");
});

app.get("/guild/:id", (req, res) => {
    sendImage(res, req.params.id, "guild");
})

app.post("/avatar/:id", verifyAuth, (req, res) => {
    if (Buffer.from(req.params.id.split(".")[0], "base64").toString() !== (req as any).user._id) return res.status(401).json({ error: "Access Denied" });
    uploadImage(res, req.params.id, "avatar", req.body.data);
});

app.post("/guild/:id", verifyAuth, (req, res) => {
    uploadImage(res, req.params.id, "guild", req.body.data);
})

app.use("*", (req, res) => {
    res.status(404).json({ error: "Resource not found." });
})

app.listen(process.env.CDN_URL?.split(":")[2], () => {
    console.log("Listening on port", process.env.CDN_URL?.split(":")[2]);
})