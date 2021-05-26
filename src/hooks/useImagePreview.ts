import Spline from "cubic-spline-ts";
import * as React from "react";
import * as twgl from "twgl.js";

const VERT = `
precision mediump float;
attribute vec2 position;
uniform mat4 transform;

varying vec2 vTexCoord;

void main() {
  gl_Position = vec4(position, 0, 1);
  vTexCoord = vec2(position.x, position.y * -1.0);
}
`;

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

const vec4 EMPTY_CLR = vec4(.25,.25,.25,1);

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
  float imageAspectRatio = imageSize.x / imageSize.y ;
  
  // clamp the longer edge
  if(imageSize.x > imageSize.y) {
    // landscape orientation
    targetWidthFactor = 1.0;
    targetHeightFactor = imageAspectRatio;
  } else {
    // portrait orientation
    targetWidthFactor = 1.0/imageAspectRatio;
    targetHeightFactor = 1.0;
  }
  
  vec2 coordTransformFactor = vec2(1.0 * targetWidthFactor, 1.0  * targetHeightFactor);
  
  vec2 scaledCoordTransformFactor;
  float viewportAspectRatio = resolution.x / resolution.y;

  if (imageSize.x > imageSize.y) {

    // landscape orientation, stretch y to fix aspect ratio
    scaledCoordTransformFactor = vec2(coordTransformFactor.x, coordTransformFactor.y / viewportAspectRatio);

    // scale back down to fit viewport
    float scaleFactor = (scaledCoordTransformFactor.y)/coordTransformFactor.y * targetHeightFactor;
    vec2 scaledDownFactor = scaledCoordTransformFactor/scaleFactor;
     
    // the frame is in portrait, further shrink it according to match viewport width
    if (imageAspectRatio > viewportAspectRatio) {
      float scaleFactor = (scaledDownFactor.x)/scaledDownFactor.x * targetWidthFactor;
      scaledDownFactor = scaledCoordTransformFactor/scaleFactor;
    }

    // apply the scaling
    scaledCoordTransformFactor = scaledDownFactor;

  } else {

    // portrait orientation
    scaledCoordTransformFactor = vec2(coordTransformFactor.x * 1.0 * viewportAspectRatio, coordTransformFactor.y);

    // scale the width down if bleed over the frame
    if(imageAspectRatio > viewportAspectRatio) {
      // shrink the image to fit viewport
      float scaleFactor = scaledCoordTransformFactor.x / coordTransformFactor.x * targetWidthFactor;
      scaledCoordTransformFactor = scaledCoordTransformFactor / scaleFactor;
    }
  }

  
  // apply the transformation
  vec2 coordPos = vTexCoord * scaledCoordTransformFactor;

  // center the image
  coordPos = vec2(coordPos.x + 1.0, coordPos.y + 1.0);

  // scale the whole thing up by 2
  coordPos = coordPos / 2.0;
  
  

  // paint black if it is outside the bound of texture
  if(coordPos.x < 0.0 || coordPos.y < 0.0 || coordPos.x > 1.0 || coordPos.y > 1.0) {
    gl_FragColor = EMPTY_CLR;
    return;
  }

  // apply tone curve adjustment to the picture
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

export function useImagePreivew(): [
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

    // twgl.resizeCanvasToDisplaySize(
    //   gl.canvas as HTMLCanvasElement,
    //   window.devicePixelRatio
    // );

    // resize canvas
    gl.canvas.width = window.innerWidth * window.devicePixelRatio;
    gl.canvas.height = (window.innerHeight / 2) * window.devicePixelRatio;

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
