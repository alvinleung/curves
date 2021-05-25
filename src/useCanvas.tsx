import Spline from "cubic-spline-ts";
import * as React from "react";
import * as twgl from "twgl.js";

export function useCanvas(): [
  React.Ref<HTMLCanvasElement>,
  CanvasRenderingContext2D
] {
  const canvasRef = React.useRef<HTMLCanvasElement>();
  const [context, setContext] = React.useState<CanvasRenderingContext2D>();

  React.useEffect(() => {
    setContext(canvasRef.current.getContext("2d"));
  }, []);

  return [canvasRef, context];
}

const VERT = `
precision mediump float;
attribute vec2 position;
uniform mat4 transform;

varying vec2 vTexCoord;

void main() {
  gl_Position = vec4(position, 0, 1);
  vTexCoord = vec2(position.x +1.0, position.y * -1.0+1.0);
}
`;

// CSPL.evalSpline = function (x, xs, ys, ks) {
//   var i = 1;
//   while (xs[i] < x) i++;

//   var t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);

//   var a = ks[i - 1] * (xs[i] - xs[i - 1]) - (ys[i] - ys[i - 1]);
//   var b = -ks[i] * (xs[i] - xs[i - 1]) + (ys[i] - ys[i - 1]);

//   var q = (1 - t) * ys[i - 1] + t * ys[i] + t * (1 - t) * (a * (1 - t) + b * t);
//   return q;
// };

const FRAG = `
precision mediump float;
uniform vec4 color;
uniform vec2 resolution; 
uniform vec2 imageSize; 

uniform float splineX[10];
uniform float splineY[10];
uniform float splineK[10];

uniform sampler2D currentImage;
varying vec2 vTexCoord;

float atSpline(float x, float xs[10], float ys[10], float ks[10]) {
  // int i = 1;
  // while (xs[i] < x) i = i+1;

  float q;

  for (int i = 1; i < 10; i++) {
    if (xs[i] >= x) {
      float t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  
      float a = ks[i - 1] * (xs[i] - xs[i - 1]) - (ys[i] - ys[i - 1]);
      float b = -ks[i] * (xs[i] - xs[i - 1] + (ys[i] - ys[i - 1]));

      q = (1.0 - t) * ys[i - 1] + t * ys[i] + t * (1.0 - t) * (a * (1.0 - t) + b * t);

      break;
    }
  }
  return q;
}

void main() {
  float targetWidthFactor;
  float targetHeightFactor;
  float imageAspectRatio = imageSize.y /imageSize.x;

  // clamp the longer edge
  if(imageSize.x > imageSize.y) {
    targetWidthFactor = 1.0;
    targetHeightFactor = 1.0/imageAspectRatio;
  } else {
    targetWidthFactor = imageAspectRatio;
    targetHeightFactor = 1.0;
  }

  vec2 coordPos = vec2((vTexCoord.x/2.0) * targetWidthFactor, (vTexCoord.y /2.0) * targetHeightFactor);

  vec4 pixelColor = texture2D(currentImage, coordPos);

  float rOriginal = pixelColor.x;
  float gOriginal = pixelColor.y; 
  float bOriginal = pixelColor.z;

  float r = atSpline(rOriginal, splineX, splineY, splineK);
  float g = atSpline(gOriginal, splineX, splineY, splineK);
  float b = atSpline(bOriginal, splineX, splineY, splineK);
  float a = 1.0;

  gl_FragColor = vec4(r,g,b,a);
}
`;

export function usePreviewCanvas(): [
  React.Ref<HTMLCanvasElement>,
  WebGLRenderingContext,
  React.MutableRefObject<Spline>,
  (image: HTMLImageElement) => void
] {
  const canvasRef = React.useRef<HTMLCanvasElement>();
  const toneCurveRef = React.useRef<Spline>(null);
  const _gl = React.useRef<WebGLRenderingContext>();

  const imageTextureRef = React.useRef<WebGLTexture>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  function changeImage(image: HTMLImageElement) {
    if (!_gl.current) {
      console.log("gl renference not ready yet");
      return;
    }
    imageRef.current = image;
    imageTextureRef.current = twgl.createTexture(_gl.current, {
      src: image,
      mag: _gl.current.NEAREST,
    });
  }

  React.useEffect(() => {
    const canvas = canvasRef.current;

    // canvas.style.width = "100%";
    // canvas.style.height = "50%";

    const gl = canvas.getContext("webgl");
    _gl.current = gl;
    const programInfo = twgl.createProgramInfo(gl, [VERT, FRAG]);

    const arrays = {
      position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    };

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    twgl.resizeCanvasToDisplaySize(
      gl.canvas as HTMLCanvasElement,
      window.devicePixelRatio
    );

    function render(time) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      if (!imageTextureRef.current) {
        requestAnimationFrame(render);
        return;
      }
      // calculate spline
      const [xs, ys, ks] = getPointsArrayFromSpline(toneCurveRef.current);

      const image: HTMLImageElement = imageRef.current;

      const uniforms = {
        color: [0.5, 0.5, 0.5, 1],
        resolution: [gl.canvas.width, gl.canvas.height],
        currentImage: imageTextureRef.current,
        imageSize: [image.width, image.height],
        splineX: xs,
        splineY: ys,
        splineK: ks,
      };

      gl.useProgram(programInfo.program);
      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, bufferInfo);

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }, []);

  return [canvasRef, _gl.current, toneCurveRef, changeImage];
}

export function getPointsArrayFromSpline(spline: Spline) {
  const xs = spline.xs;
  const ys = spline.ys;
  const ks = spline.ks;

  return [xs, ys, ks];
}
