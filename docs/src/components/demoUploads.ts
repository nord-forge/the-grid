import type { FileUploadOptions } from '@nord-forge/the-grid';

import type { Person } from './demoData';

/** Local demo transport: no file content leaves the browser. */
export const demoUpload: FileUploadOptions<Person>['upload'] = ({ file, signal, reportProgress }) =>
    new Promise((resolve, reject) => {
        let percent = 0;
        const cleanup = () => {
            clearInterval(timer);
            signal.removeEventListener('abort', cancel);
        };
        const cancel = () => {
            cleanup();
            reject(new Error('Upload cancelled.'));
        };
        const timer = setInterval(() => {
            percent += 10;
            reportProgress(percent);
            if (percent === 100) {
                cleanup();
                if (file.name.toLowerCase().includes('fail'))
                    reject(new Error('Demo upload failed. Use Retry to try again.'));
                else resolve({ name: file.name, size: file.size, type: file.type });
            }
        }, 150);
        signal.addEventListener('abort', cancel, { once: true });
        if (signal.aborted) cancel();
    });
