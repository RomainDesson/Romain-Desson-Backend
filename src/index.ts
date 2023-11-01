import express from 'express';
import {PrismaClient} from "@prisma/client";
import cors from 'cors'
import {upload} from "./utils/uploadFile";
import {bucket} from "./utils/gcpClient";

const app = express();

const PORT = 3000;

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json())

app.get('/articles', async (req, res) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 4;
    const skip = (page - 1) * pageSize;
    try {
        const articles = await prisma.blogPost.findMany({
            skip,
            take: pageSize
        });
        const totalCount = await prisma.blogPost.count();

        res.json({
            articles,
            totalCount
        });
    } catch (error) {
        res.status(500).json({ error: "An error occurred while retrieving articles." });
    }
});

app.get('/articles/:id', async(req, res) => {
    const { id } = req.params;

    try {
        const article = await prisma.blogPost.findUnique({
            where: {
                id: parseInt(id, 10)
            }
        });
        res.json(article);
    } catch (error) {
        res.status(500).json({ error: "An error occurred while retrieving articles." });
    }
})

app.post('/articles', upload.single('image'),  async (req, res) => {
    try {
        const { title, preview, content } = req.body;
        const imageFile = req.file;

        if (!imageFile) {
            throw new Error('Image is required');
        }

        const fileName = Date.now() + imageFile.originalname;
        const file = bucket.file(fileName);

        const stream = file.createWriteStream({
            metadata: {
                contentType: imageFile.mimetype,
            },
        });

        const uploadPromise = new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('finish', resolve);
        });

        stream.end(imageFile.buffer);

        await uploadPromise;
        await file.makePublic();

        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        const newBlogPost = await prisma.blogPost.create({
            data: {
                title,
                preview,
                content,
                imageUrl,
            },
        });

        res.json(newBlogPost);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/`);
});
