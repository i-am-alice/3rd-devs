export const canvas = document.getElementById('visualizationCanvas') as HTMLCanvasElement;
export const canvasCtx = canvas.getContext('2d');

if (!canvas || !canvasCtx) {
    console.error('Canvas or canvas context not available');
}