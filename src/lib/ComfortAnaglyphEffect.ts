import {
  LinearFilter,
  Matrix3,
  NearestFilter,
  RGBAFormat,
  ShaderMaterial,
  StereoCamera,
  WebGLRenderer,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type Scene,
} from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const fragmentShader = `
uniform sampler2D mapLeft;
uniform sampler2D mapRight;
uniform mat3 colorMatrixLeft;
uniform mat3 colorMatrixRight;
varying vec2 vUv;
void main() {
  vec4 colorL = texture2D(mapLeft, vUv);
  vec4 colorR = texture2D(mapRight, vUv);
  vec3 color = clamp(
    colorMatrixLeft * colorL.rgb + colorMatrixRight * colorR.rgb,
    0.0, 1.0
  );
  gl_FragColor = vec4(color, max(colorL.a, colorR.a));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export class ComfortAnaglyphEffect {
  private readonly stereo = new StereoCamera()
  private swapEyes = false
  private readonly leftTarget: WebGLRenderTarget
  private readonly rightTarget: WebGLRenderTarget
  private readonly material: ShaderMaterial
  private readonly quad: FullScreenQuad

  constructor(
    private readonly renderer: WebGLRenderer,
    eyeSeparation = 0.026,
  ) {
    this.stereo.eyeSep = eyeSeparation
    const targetOptions = {
      minFilter: LinearFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
    }
    this.leftTarget = new WebGLRenderTarget(512, 512, targetOptions)
    this.rightTarget = new WebGLRenderTarget(512, 512, targetOptions)
    this.material = new ShaderMaterial({
      uniforms: {
        mapLeft: { value: this.leftTarget.texture },
        mapRight: { value: this.rightTarget.texture },
        colorMatrixLeft: {
          value: new Matrix3().fromArray([
            0.4561, -0.0400822, -0.0152161,
            0.500484, -0.0378246, -0.0205971,
            0.176381, -0.0157589, -0.00546856,
          ]),
        },
        colorMatrixRight: {
          value: new Matrix3().fromArray([
            -0.0434706, 0.378476, -0.0721527,
            -0.0879388, 0.73364, -0.112961,
            -0.00155529, -0.0184503, 1.2264,
          ]),
        },
      },
      vertexShader,
      fragmentShader,
    })
    this.quad = new FullScreenQuad(this.material)
  }

  setEyeSeparation(value: number) {
    this.stereo.eyeSep = value
  }

  setSwapEyes(value: boolean) {
    this.swapEyes = value
  }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height)
    const pixelRatio = this.renderer.getPixelRatio()
    this.leftTarget.setSize(width * pixelRatio, height * pixelRatio)
    this.rightTarget.setSize(width * pixelRatio, height * pixelRatio)
  }

  render(scene: Scene, camera: PerspectiveCamera) {
    const currentTarget = this.renderer.getRenderTarget()
    if (scene.matrixWorldAutoUpdate) scene.updateMatrixWorld()
    if (camera.parent === null && camera.matrixWorldAutoUpdate) camera.updateMatrixWorld()
    this.stereo.update(camera)

    this.renderer.setRenderTarget(this.swapEyes ? this.rightTarget : this.leftTarget)
    this.renderer.clear()
    this.renderer.render(scene, this.stereo.cameraL)
    this.renderer.setRenderTarget(this.swapEyes ? this.leftTarget : this.rightTarget)
    this.renderer.clear()
    this.renderer.render(scene, this.stereo.cameraR)
    this.renderer.setRenderTarget(null)
    this.quad.render(this.renderer)
    this.renderer.setRenderTarget(currentTarget)
  }

  dispose() {
    this.leftTarget.dispose()
    this.rightTarget.dispose()
    this.material.dispose()
    this.quad.dispose()
  }
}
