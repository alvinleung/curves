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

uniform float splineX_red[10];
uniform float splineY_red[10];
uniform float splineK_red[10];

uniform float splineX_green[10];
uniform float splineY_green[10];
uniform float splineK_green[10];

uniform float splineX_blue[10];
uniform float splineY_blue[10];
uniform float splineK_blue[10];

uniform float splineX_luminance[10];
uniform float splineY_luminance[10];
uniform float splineK_luminance[10];



uniform vec4 backgroundColor;

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
      float b = -ks[i] * (xs[i] - xs[i - 1]) + (ys[i] - ys[i - 1]);

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
    gl_FragColor = backgroundColor;
    return;
  }

  // apply tone curve adjustment to the picture
  vec4 pixelColor = texture2D(currentImage, coordPos);


  float rOriginal = pixelColor.x;
  float gOriginal = pixelColor.y; 
  float bOriginal = pixelColor.z;
  
  float rLuminance = atSpline(rOriginal, splineX_luminance, splineY_luminance, splineK_luminance);
  float gLuminance = atSpline(gOriginal, splineX_luminance, splineY_luminance, splineK_luminance);
  float bLuminance = atSpline(bOriginal, splineX_luminance, splineY_luminance, splineK_luminance);

  float r = atSpline(rLuminance, splineX_red, splineY_red, splineK_red);
  float g = atSpline(gLuminance, splineX_green, splineY_green, splineK_green);
  float b = atSpline(bLuminance, splineX_blue, splineY_blue, splineK_blue);

  float rChannelOut = r;
  float gChannelOut = g;
  float bChannelOut = b;
  float aChannelOut = 1.0;

  gl_FragColor = vec4(rChannelOut,gChannelOut,bChannelOut,aChannelOut);
}
`;

export interface ToneCurves {
  red: Spline;
  green: Spline;
  blue: Spline;
  luminance: Spline;
}

export const EMPTY_SPLINE = new Spline([0, 1], [0, 1]);

export function useImagePreivew(): [
  React.Ref<HTMLCanvasElement>,
  WebGLRenderingContext,
  React.MutableRefObject<ToneCurves>,
  (image: HTMLImageElement) => void
] {
  const canvasRef = React.useRef<HTMLCanvasElement>();
  const toneCurveRef = React.useRef<ToneCurves>({
    red: EMPTY_SPLINE,
    green: EMPTY_SPLINE,
    blue: EMPTY_SPLINE,
    luminance: EMPTY_SPLINE,
  });
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

    // resize canvas to occupy the space
    const canvasSizeMeasurement = canvasRef.current.getBoundingClientRect();
    const { width, height } = canvasSizeMeasurement;
    gl.canvas.width = width * window.devicePixelRatio;
    gl.canvas.height = height * window.devicePixelRatio;

    function render(time) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      if (!imageTextureRef.current) {
        requestAnimationFrame(render);
        return;
      }
      // calculate spline
      // const [xs, ys, ks] = getPointsArrayFromSpline(toneCurveRef.current);
      const [xs_red, ys_red, ks_red] = getPointsArrayFromSpline(
        toneCurveRef.current.red
      );
      const [xs_green, ys_green, ks_green] = getPointsArrayFromSpline(
        toneCurveRef.current.green
      );
      const [xs_blue, ys_blue, ks_blue] = getPointsArrayFromSpline(
        toneCurveRef.current.blue
      );
      const [xs_luminance, ys_luminance, ks_luminance] =
        getPointsArrayFromSpline(toneCurveRef.current.luminance);

      const image: HTMLImageElement = imageRef.current;

      const uniforms = {
        color: [0.5, 0.5, 0.5, 1],
        resolution: [gl.canvas.width, gl.canvas.height],
        currentImage: imageTextureRef.current,
        imageSize: [image.width, image.height],
        backgroundColor: [0.9, 0.9, 0.9, 1],
        splineX_luminance: xs_luminance,
        splineY_luminance: ys_luminance,
        splineK_luminance: ks_luminance,
        splineX_red: xs_red,
        splineY_red: ys_red,
        splineK_red: ks_red,
        splineX_green: xs_green,
        splineY_green: ys_green,
        splineK_green: ks_green,
        splineX_blue: xs_blue,
        splineY_blue: ys_blue,
        splineK_blue: ks_blue,
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
