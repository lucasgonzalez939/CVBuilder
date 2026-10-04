(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.CVImageService = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const readFileAsDataUrl = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (error) => reject(error || new Error('Failed to read image file.'));

            reader.readAsDataURL(file);
        });
    };

    const loadImage = (dataUrl) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image for processing.'));
            img.src = dataUrl;
        });
    };

    const cropImageToSquareDataUrl = ({ image, displaySize = 150, outputType = 'image/png' }) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Canvas context is not available for image processing.');
        }

        const size = Math.min(image.naturalWidth, image.naturalHeight);
        const x = (image.naturalWidth - size) / 2;
        const y = (image.naturalHeight - size) / 2;

        canvas.width = displaySize;
        canvas.height = displaySize;

        context.drawImage(image, x, y, size, size, 0, 0, displaySize, displaySize);

        return {
            profilePicture: canvas.toDataURL(outputType),
            profilePictureWidth: displaySize,
            profilePictureHeight: displaySize,
        };
    };

    const processProfileImageFile = async (file, options = {}) => {
        if (!file) {
            throw new Error('No image file provided.');
        }

        const dataUrl = await readFileAsDataUrl(file);
        const image = await loadImage(dataUrl);

        return cropImageToSquareDataUrl({
            image,
            displaySize: options.displaySize ?? 150,
            outputType: options.outputType ?? 'image/png',
        });
    };

    return {
        processProfileImageFile,
    };
}));
