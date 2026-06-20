/**
 * Converts an uploaded cover image into a standardized WebP file.
 *
 * Resizes the image if necessary and converts it to WebP format.
 *
 * @param file Original image selected by the user.
 * @returns Optimized WebP cover image file.
 * @throws Error if the image cannot be processed or encoded.
 */
export async function optimizeCoverFile(file: File): Promise<File> {
    // Decode the uploaded image into a bitmap for efficient resizing.
    const bitmap = await createImageBitmap(file);

    // Limit cover width
    const maxWidth = 900;

    // Preserve aspect ratio while preventing upscaling.
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    // Draw the resized image onto an offscreen canvas.
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Unable to prepare cover image.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    // Release bitmap
    bitmap.close();

    // Encode the resized image as WebP.
    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.84),
    );

    if (!blob) {
        throw new Error("Unable to optimize cover image.");
    }

    // Preserve the original filename while replacing the extension with .webp.
    return new File(
        [blob],
        `${file.name.replace(/\.[^.]+$/, "") || "cover"}.webp`,
        {
            type: "image/webp",
        },
    );
}
