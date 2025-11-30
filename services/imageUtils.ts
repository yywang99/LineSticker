
/**
 * Converts a File object to a Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Removes a solid background (Green or Blue) using HSL Chroma Keying.
 * @param imageSrc The base64 image source
 * @param sensitivity 0 to 100 (default 50).
 * @param targetColor 'green' or 'blue' (default 'green')
 */
export const removeGreenBackground = (
  imageSrc: string, 
  sensitivity: number = 50,
  targetColor: 'green' | 'blue' = 'green'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate thresholds based on sensitivity (0-100)
      const s = Math.max(0, Math.min(100, sensitivity)) / 100;
      
      // Configure HSL targets based on color
      let targetHue = 120; // Green
      if (targetColor === 'blue') targetHue = 240; // Blue

      // Hue bandwidth
      // Sensitivity 0: +/- 20 deg
      // Sensitivity 1: +/- 80 deg
      const hueWidth = 20 + (s * 60); 
      const hueMin = targetHue - hueWidth;
      const hueMax = targetHue + hueWidth;

      // Saturation:
      const satMin = 0.5 - (s * 0.4);

      // Lightness:
      const lightMin = 0.2 - (s * 0.15);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Convert RGB to HSL
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        let h = 0; 
        let sat = 0;
        const l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          
          switch (max) {
            case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
            case gNorm: h = (bNorm - rNorm) / d + 2; break;
            case bNorm: h = (rNorm - gNorm) / d + 4; break;
          }
          h *= 60; // Convert to degrees
        }

        const isTargetHue = h >= hueMin && h <= hueMax;
        const isSaturated = sat >= satMin; 
        const isNotTooDark = l >= lightMin;

        // Dominance check (Safety check in RGB space)
        let isDominant = false;
        if (targetColor === 'green') {
           // Green must be stronger than Red and Blue
           isDominant = (g > r && g > b); 
        } else {
           // Blue must be stronger than Red and Green
           isDominant = (b > r && b > g);
        }
        
        // Relax dominance check if sensitivity is high
        if (s > 0.7) isDominant = true;

        if (isTargetHue && isSaturated && isNotTooDark && isDominant) {
          data[i + 3] = 0; // Set Alpha to 0
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = (err) => reject(err);
  });
};
