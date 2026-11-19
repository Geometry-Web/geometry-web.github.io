// WebGL 2 renderer — batched colored-triangle pipeline (one draw call/frame).

import type { Camera } from './Camera';
import { type Renderer, type Color, rotatePoint } from './Renderer';

const VERT_SRC = `#version 300 es
in vec2 a_pos;
in vec4 a_color;
out vec4 v_color;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_color = a_color;
}
`;

const FRAG_SRC = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 outColor;
void main() {
  outColor = v_color;
}
`;

const MAX_FLOATS = 1 << 18; // 262144 floats ≈ 43k vertices

export class WebGL2Renderer implements Renderer {
  readonly kind = 'webgl2' as const;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private vbo: WebGLBuffer;
  private aPos = 0;
  private aColor = 0;

  private verts: number[] = [];
  private cam: Camera | null = null;
  private viewW = 960;
  private viewH = 540;
  private clearColor: Color = { r: 0, g: 0, b: 0, a: 1 };

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;

    const program = gl.createProgram();
    if (!program) throw new Error('createProgram failed');
    this.program = program;

    const vs = this.compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
    }

    this.aPos = gl.getAttribLocation(program, 'a_pos');
    this.aColor = gl.getAttribLocation(program, 'a_color');

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_FLOATS * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, 24, 8);
    gl.bindVertexArray(null);

    this.vao = vao;
    this.vbo = vbo as WebGLBuffer;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('createShader failed');
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  resize(w: number, h: number, dpr: number): void {
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  begin(camera: Camera, clear: Color): void {
    this.cam = camera;
    this.viewW = camera.viewW;
    this.viewH = camera.viewH;
    this.clearColor = clear;
    this.verts.length = 0;
  }

  private toClip(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx / this.viewW) * 2 - 1,
      y: 1 - (sy / this.viewH) * 2,
    };
  }

  private pushVert(x: number, y: number, color: Color): void {
    this.verts.push(x, y, color.r, color.g, color.b, color.a);
  }

  private tri(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    color: Color,
  ): void {
    const cam = this.cam;
    if (!cam) return;
    const a = this.toClip(cam.screenX(x1), cam.screenY(y1));
    const b = this.toClip(cam.screenX(x2), cam.screenY(y2));
    const c = this.toClip(cam.screenX(x3), cam.screenY(y3));
    this.pushVert(a.x, a.y, color);
    this.pushVert(b.x, b.y, color);
    this.pushVert(c.x, c.y, color);
  }

  fillRect(x: number, y: number, w: number, h: number, color: Color, rotationDeg = 0): void {
    const hw = w / 2;
    const hh = h / 2;
    const pts = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ].map((p) => rotatePoint(p.x, p.y, 0, 0, rotationDeg));
    this.tri(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y, color);
    this.tri(pts[0].x, pts[0].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y, color);
  }

  strokeRect(x: number, y: number, w: number, h: number, color: Color, lineWidth: number): void {
    const t = lineWidth / 2;
    this.fillRect(x, y - h / 2 + t, w, lineWidth, color);
    this.fillRect(x, y + h / 2 - t, w, lineWidth, color);
    this.fillRect(x - w / 2 + t, y, lineWidth, h, color);
    this.fillRect(x + w / 2 - t, y, lineWidth, h, color);
  }

  fillTriangle(x: number, y: number, w: number, h: number, color: Color, rotationDeg = 0): void {
    const pts = [
      { x: 0, y: h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: -w / 2, y: -h / 2 },
    ].map((p) => rotatePoint(p.x, p.y, 0, 0, rotationDeg));
    this.tri(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y, color);
  }

  fillCircle(x: number, y: number, radius: number, color: Color): void {
    const seg = 16;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      this.tri(
        x,
        y,
        x + Math.cos(a0) * radius,
        y + Math.sin(a0) * radius,
        x + Math.cos(a1) * radius,
        y + Math.sin(a1) * radius,
        color,
      );
    }
  }

  end(): void {
    const gl = this.gl;
    if (this.verts.length === 0) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearColor.a);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const data = new Float32Array(this.verts);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    gl.drawArrays(gl.TRIANGLES, 0, this.verts.length / 6);
    gl.bindVertexArray(null);
    this.verts.length = 0;
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.vbo);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
