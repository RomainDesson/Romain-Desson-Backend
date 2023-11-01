import { Storage } from '@google-cloud/storage';

const gcpStorage = new Storage({
    projectId: 'romain-desson',
    keyFilename: './gcp-config.json',
});

export const bucket = gcpStorage.bucket('blogpost-romain-desson');
