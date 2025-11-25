export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    return await fileToBase64(new File([blob], "image.png", { type: blob.type }));
  } catch (error) {
    console.error("CORS or Network Error converting URL to Base64:", error);
    throw new Error("无法加载此图片（可能是跨域限制），请尝试下载后上传。");
  }
};

export const getMimeTypeFromBase64 = (base64String: string): string => {
  // Simple check, defaulting to png if unsure since API is flexible with mime types usually
  if (base64String.startsWith('/9j/')) return 'image/jpeg';
  return 'image/png';
};