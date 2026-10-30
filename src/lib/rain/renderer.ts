import type { PaintedBackground } from './background';
import { INSTANCE_STRIDE } from './drops';

/**
 * Two WebGL2 passes:
 * 1. Every drop is drawn as an instanced quad into a "water map" that stores
 *    the surface normal (rg), thickness (b) and coverage (a) at each pixel.
 * 2. A full-screen pass reads the water map. Outside drops it shows the fogged
 *    scene; inside, it treats the drop as a lens and samples the sharp scene
 *    at a refracted, flipped offset, then adds a dark rim and a highlight.
 */

const DROP_VS = `#version 300 es
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aDrop;
uniform vec2 uSize;
out vec2 vLocal;
void main() {
	vLocal = aCorner;
	// Drops are a little flatter on top and heavier at the bottom.
	vec2 local = aCorner * vec2(1.0, aDrop.w);
	vec2 px = aDrop.xy + local * aDrop.z;
	vec2 clip = px / uSize * 2.0 - 1.0;
	gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const DROP_FS = `#version 300 es
precision mediump float;
in vec2 vLocal;
out vec4 outColor;
void main() {
	vec2 p = vLocal;
	// Bottom-heavy bead: squash the top half slightly.
	p.y *= p.y < 0.0 ? 1.12 : 0.95;
	float d = length(p);
	if (d > 1.0) discard;
	float h = sqrt(1.0 - d * d);
	float coverage = smoothstep(1.0, 0.82, d);
	outColor = vec4(p * 0.5 + 0.5, h, coverage);
}`;

const SCREEN_VS = `#version 300 es
const vec2 pts[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 vUv;
void main() {
	vec2 p = pts[gl_VertexID];
	vUv = p * 0.5 + 0.5;
	gl_Position = vec4(p, 0.0, 1.0);
}`;

const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSharp;
uniform sampler2D uFog;
uniform sampler2D uWater;
uniform vec2 uSize;
uniform float uTime;
uniform float uRefraction;
uniform float uStreaks;
uniform float uBrightness;
uniform vec3 uTint;
uniform float uZoom;
uniform vec2 uFocus;
out vec4 outColor;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

// Thin falling rain behind the glass, two layers for depth.
float rainLayer(vec2 uv, float columns, float speed, float density, float seed) {
	vec2 p = uv * vec2(uSize.x / uSize.y, 1.0);
	p.x += p.y * 0.08;
	float cx = p.x * columns;
	float id = floor(cx) + seed;
	if (hash(id) > density) return 0.0;
	float fx = fract(cx) - 0.5;
	float width = 0.09;
	float line = 1.0 - smoothstep(0.0, width, abs(fx));
	float y = fract(p.y * (0.6 + hash(id + 3.0) * 0.6) + uTime * speed * (0.8 + hash(id + 5.0) * 0.5) + hash(id + 9.0));
	float len = 0.12 + hash(id + 11.0) * 0.2;
	float streak = y < len ? smoothstep(0.0, len, y) : 0.0;
	return line * streak;
}

float rain(vec2 uv) {
	return rainLayer(uv, 90.0, 1.9, 0.35, 0.0) * 0.6 + rainLayer(uv, 220.0, 1.4, 0.3, 50.0) * 0.35;
}

void main() {
	// Page transitions move the viewer: toward the window (zoom > 0) or back (< 0).
	// The glass is nearer than the scene, so it grows faster: that is the depth.
	// The scene is always framed a little wide, so stepping back has room.
	vec2 glassUv = uFocus + (vUv - uFocus) / (1.0 + max(uZoom, 0.0) * 0.3);
	vec2 sceneUv = uFocus + (vUv - uFocus) / (1.04 + uZoom * 0.12);
	// Halfway through, the view passes through mist.
	float mist = smoothstep(0.0, 1.0, abs(uZoom));

	vec4 water = texture(uWater, glassUv);
	float cover = water.a * (1.0 - mist * 0.5);
	// Water map is in screen space with y down; flip the normal into uv space.
	vec2 n = (water.rg * 2.0 - 1.0) * vec2(1.0, -1.0);
	float h = water.b;

	vec3 fog = texture(uFog, sceneUv).rgb;
	fog += vec3(0.75, 0.82, 0.82) * rain(sceneUv) * uStreaks * 0.16;

	// A drop is a tiny fisheye lens: it shows a flipped, wider view of the scene.
	vec2 aspect = vec2(uSize.y / uSize.x, 1.0);
	vec2 refracted = sceneUv - n * uRefraction * aspect * (0.35 + h);
	vec3 inside = texture(uSharp, refracted).rgb;
	inside += vec3(0.8, 0.86, 0.86) * rain(refracted) * uStreaks * 0.1;
	inside *= 1.08;

	// Dark rim where the surface tilts away, soft highlight from the sky above.
	float rim = pow(1.0 - h, 2.2);
	inside = mix(inside, inside * 0.35, rim * 0.85);
	vec3 normal3 = normalize(vec3(n, h * 1.4));
	float spec = pow(max(dot(normal3, normalize(vec3(-0.25, 0.55, 0.8))), 0.0), 28.0);
	inside += spec * 0.28;

	vec3 color = mix(fog, inside, cover);
	color *= uBrightness * uTint * (1.0 + mist * 0.08);

	// Gentle vignette and a whisper of grain so gradients do not band.
	vec2 c = vUv - 0.5;
	color *= 1.0 - dot(c, c) * 0.55;
	color += (hash(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) - 0.5) / 255.0;

	outColor = vec4(color, 1.0);
}`;

export type FrameParams = {
	time: number;
	refraction: number;
	streaks: number;
	brightness: number;
	tint: [number, number, number];
	/** -1 (stepped back) … 0 (at rest) … 1 (pressed up to the glass). */
	zoom: number;
	/** The point the view moves toward, in uv (0..1, y up). */
	focus: [number, number];
};

export class GlassRenderer {
	readonly gl: WebGL2RenderingContext;
	private dropProgram: WebGLProgram;
	private compositeProgram: WebGLProgram;
	private dropVao: WebGLVertexArrayObject;
	private instanceBuffer: WebGLBuffer;
	private waterTexture: WebGLTexture | null = null;
	private waterFbo: WebGLFramebuffer | null = null;
	private sharpTexture: WebGLTexture;
	private fogTexture: WebGLTexture;
	private emptyVao: WebGLVertexArrayObject;
	private cssWidth = 1;
	private cssHeight = 1;
	private waterWidth = 1;
	private waterHeight = 1;
	private uniforms: Record<string, WebGLUniformLocation | null> = {};

	static create(canvas: HTMLCanvasElement): GlassRenderer | null {
		const gl = canvas.getContext('webgl2', {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false,
			premultipliedAlpha: false,
			powerPreference: 'high-performance'
		});
		return gl ? new GlassRenderer(gl) : null;
	}

	private constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.dropProgram = program(gl, DROP_VS, DROP_FS);
		this.compositeProgram = program(gl, SCREEN_VS, COMPOSITE_FS);

		this.dropVao = gl.createVertexArray()!;
		gl.bindVertexArray(this.dropVao);
		const corners = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, corners);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		this.instanceBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, INSTANCE_STRIDE, gl.FLOAT, false, 0, 0);
		gl.vertexAttribDivisor(1, 1);
		gl.bindVertexArray(null);

		this.emptyVao = gl.createVertexArray()!;
		this.sharpTexture = texture(gl);
		this.fogTexture = texture(gl);

		for (const name of ['uSize'])
			this.uniforms['drop.' + name] = gl.getUniformLocation(this.dropProgram, name);
		for (const name of [
			'uSharp',
			'uFog',
			'uWater',
			'uSize',
			'uTime',
			'uRefraction',
			'uStreaks',
			'uBrightness',
			'uTint',
			'uZoom',
			'uFocus'
		]) {
			this.uniforms[name] = gl.getUniformLocation(this.compositeProgram, name);
		}
	}

	/** Canvas pixels for the final image; the water map stays at CSS resolution. */
	resize(cssWidth: number, cssHeight: number, pixelRatio: number) {
		const gl = this.gl;
		const canvas = gl.canvas as HTMLCanvasElement;
		canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
		canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
		this.cssWidth = cssWidth;
		this.cssHeight = cssHeight;
		this.waterWidth = Math.max(1, Math.round(cssWidth));
		this.waterHeight = Math.max(1, Math.round(cssHeight));

		if (this.waterTexture) gl.deleteTexture(this.waterTexture);
		if (this.waterFbo) gl.deleteFramebuffer(this.waterFbo);
		this.waterTexture = texture(gl);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA8,
			this.waterWidth,
			this.waterHeight,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null
		);
		this.waterFbo = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.waterFbo);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this.waterTexture,
			0
		);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	setBackground(bg: PaintedBackground) {
		const gl = this.gl;
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.bindTexture(gl.TEXTURE_2D, this.sharpTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bg.sharp);
		gl.bindTexture(gl.TEXTURE_2D, this.fogTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bg.fog);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	}

	render(instances: Float32Array, count: number, p: FrameParams) {
		const gl = this.gl;

		// Pass 1: water map.
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.waterFbo);
		gl.viewport(0, 0, this.waterWidth, this.waterHeight);
		gl.clearColor(0.5, 0.5, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		if (count > 0) {
			gl.useProgram(this.dropProgram);
			gl.uniform2f(this.uniforms['drop.uSize'], this.cssWidth, this.cssHeight);
			gl.bindVertexArray(this.dropVao);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				instances.subarray(0, count * INSTANCE_STRIDE),
				gl.STREAM_DRAW
			);
			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
			gl.disable(gl.BLEND);
			gl.bindVertexArray(null);
		}

		// Pass 2: composite to screen.
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.useProgram(this.compositeProgram);
		bindTexture(gl, 0, this.sharpTexture, this.uniforms.uSharp);
		bindTexture(gl, 1, this.fogTexture, this.uniforms.uFog);
		bindTexture(gl, 2, this.waterTexture!, this.uniforms.uWater);
		gl.uniform2f(this.uniforms.uSize, this.cssWidth, this.cssHeight);
		gl.uniform1f(this.uniforms.uTime, p.time);
		gl.uniform1f(this.uniforms.uRefraction, p.refraction);
		gl.uniform1f(this.uniforms.uStreaks, p.streaks);
		gl.uniform1f(this.uniforms.uBrightness, p.brightness);
		gl.uniform3f(this.uniforms.uTint, p.tint[0], p.tint[1], p.tint[2]);
		gl.uniform1f(this.uniforms.uZoom, p.zoom);
		gl.uniform2f(this.uniforms.uFocus, p.focus[0], p.focus[1]);
		gl.bindVertexArray(this.emptyVao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.bindVertexArray(null);
	}

	destroy() {
		const gl = this.gl;
		gl.deleteProgram(this.dropProgram);
		gl.deleteProgram(this.compositeProgram);
		gl.deleteBuffer(this.instanceBuffer);
		gl.deleteTexture(this.sharpTexture);
		gl.deleteTexture(this.fogTexture);
		if (this.waterTexture) gl.deleteTexture(this.waterTexture);
		if (this.waterFbo) gl.deleteFramebuffer(this.waterFbo);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}

function shader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
	const s = gl.createShader(type)!;
	gl.shaderSource(s, source);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		throw new Error(`Rain shader failed to compile: ${gl.getShaderInfoLog(s)}`);
	}
	return s;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
	const p = gl.createProgram()!;
	gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs));
	gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
		throw new Error(`Rain shader failed to link: ${gl.getProgramInfoLog(p)}`);
	}
	return p;
}

function texture(gl: WebGL2RenderingContext): WebGLTexture {
	const t = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, t);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return t;
}

function bindTexture(
	gl: WebGL2RenderingContext,
	unit: number,
	tex: WebGLTexture,
	location: WebGLUniformLocation | null
) {
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.uniform1i(location, unit);
}
