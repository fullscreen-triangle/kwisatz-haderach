import {memo, useEffect, useRef} from 'react';
import * as THREE from 'three';
import {gsap ,Expo} from "gsap";


export interface DsnWebgelDirctionParams {
    parent: any,
    data: Object[],
    direction: "vertical" | "horizontal",
    displacement?:  string,
    nextEl?: HTMLElement,
    prevEl?: HTMLElement,
    intensity?: number,
    onComplete?: any,
    swiper?: any,
    speedIn?: number,
    easing?: any,

}


function effectSwiper($obj) {

    let progressStart = 0;
    let start = false;

    $obj.swiper.on("progress", (s) => {


        if (!start)
            return;

        if (progressStart < s.progress)
            this.mat.uniforms.effectFactor.value = $obj.intensity * -1;
        else if (progressStart > s.progress)
            this.mat.uniforms.effectFactor.value = $obj.intensity;


        const progress = s.slides[s.activeIndex].progress,
            charOpacity = 1 - Math.min(Math.abs(progress), 1);


        // this.mat.uniforms.dispFactor.value = charOpacity ;
        gsap.set(this.mat.uniforms.dispFactor, {
            value: charOpacity,
            ease: "none",
        });

        this.animate();

    });


    $obj.swiper.on("touchStart", (swiper) => {
        start = true;
        progressStart = swiper.progress;
    });
    $obj.swiper.on("touchEnd", () => {
        start = false;

        gsap.to(this.mat.uniforms.dispFactor, $obj.speedIn, {
            value: 1,
            ease: $obj.easing,

            onUpdate: () => {
                this.animate();

                if ($obj.onUpdate !== undefined) {
                    $obj.onUpdate.bind(this)();
                }
            }
        });
    });


}

const vertex = `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`;

const getFragment = (direction) => {



    let dir = "";
    if (direction !== "horizontal") {
        dir = `vec2 distortedPosition = vec2(uv.x, uv.y - dispFactor * (disp.r*effectFactor));
					vec2 distortedPosition2 = vec2(uv.x, uv.y + (1.0 - dispFactor) * (disp.r*effectFactor));`;
    } else {
        dir = ` vec2 distortedPosition = vec2(uv.x + dispFactor * (disp.r*effectFactor), uv.y);
            vec2 distortedPosition2 = vec2(uv.x - (1.0 - dispFactor) * (disp.r*effectFactor), uv.y);

            `;
    }

    return `
        varying vec2 vUv;


        uniform sampler2D texture1;
        uniform sampler2D texture2;
        uniform sampler2D disp;

        uniform float dispFactor;
        uniform float effectFactor;
		uniform vec4 resolution;



        void main() {

            vec2 uv = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);
            

            vec4 disp = texture2D(disp, uv);

            ${dir}

            vec4 _texture = texture2D(texture1, distortedPosition);
            vec4 _texture2 = texture2D(texture2, distortedPosition2);

            vec4 finalTexture = mix(_texture, _texture2, dispFactor);

            gl_FragColor = finalTexture;

        }
    `;
}


function DsnWebgelDirction(props: DsnWebgelDirctionParams) {
    const {
        parent,
        displacement = '/img/displacement/8.jpg',
        data = [],
        intensity = 1,
        direction,
        onComplete,
        speedIn = 1.6,
        easing = Expo.easeOut
    } = props;

    const canvas = useRef(null);


    const $this = {
        scene: undefined,
        width: undefined,
        height: undefined,
        ratio: undefined,
        video: false,
        renderer: undefined,
        camera: undefined,
        manager: undefined,
        loader: undefined,
        disp: undefined,
        allImgs: [],
        mat: undefined,
        geometry: undefined,
        plane: undefined,
        animate: undefined,
        destroyed: false,
        current: 0,
        imageAspect: undefined,
        changeTo: undefined


    };


    const getRenderer = async () => {

        $this.ratio = window.devicePixelRatio;

        return new THREE.WebGLRenderer({
            canvas: canvas.current,
            powerPreference: "high-performance",
            antialias: false,
            alpha: true

        });

    }

    const video = (src, poster, $index) => {

        let dImg = new THREE.VideoTexture(src);
        dImg.magFilter = THREE.LinearFilter;
        dImg.minFilter = THREE.LinearFilter;
        dImg.anisotropy = $this.renderer.capabilities.getMaxAnisotropy();
        $this.allImgs[$index] = dImg;


    }

    const image = (src, $index) => {
        const dImg = $this.loader.load(src);
        dImg.magFilter = THREE.LinearFilter;
        dImg.minFilter = THREE.LinearFilter;
        dImg.anisotropy = $this.renderer.capabilities.getMaxAnisotropy();
        $this.allImgs[$index] = dImg;

    }

    const resize = () => {

        let image = $this.allImgs[$this.current].image;


        $this.width = parent?.current?.offsetWidth;
        $this.height = parent?.current?.offsetHeight;

        $this.renderer.setSize($this.width, $this.height);

        $this.camera.aspect = $this.width / $this.height;


        $this.imageAspect = image.height / image.width;


        let a1;
        let a2;
        if ($this.height / $this.width > $this.imageAspect) {
            a1 = ($this.width / $this.height) * $this.imageAspect;
            a2 = 1;
        } else {
            a1 = 1;
            a2 = ($this.height / $this.width) / $this.imageAspect;
        }

        const dist = $this.camera.position.z;
        const height = 1;
        $this.camera.fov = 2 * (180 / Math.PI) * Math.atan(height / (2 * dist));

        $this.plane.scale.x = $this.camera.aspect;
        $this.plane.scale.y = 1;

        gsap.to($this.mat.uniforms.resolution.value, 0.1, {
            x: $this.width,
            y: $this.height,
            z: a1,
            w: a2,
            yoyo: true,
            onUpdate: () => {
                $this.camera.updateProjectionMatrix();
                $this.animate();

            },
            ease: 'none'
        })

    }

    const destroy = () => {
        $this.destroyed = true;

        window.removeEventListener("resize", resize);

        $this.renderer.forceContextLoss();
        $this.renderer.dispose();
        $this.renderer = null;

        $this.manager = null;
        $this.video = null;


        $this.geometry.dispose();
        $this.geometry = null;

        $this.mat.dispose();
        $this.mat = null;


        $this.plane = null;

        $this.loader = null;
        $this.ratio = null;
        $this.scene.dispose();
        $this.scene = null;

        $this.width = $this.height = $this.imageAspect = null;

    }

    const init = useRef(false);


    $this.changeTo = function (current, oldIndex) {

        if (current > oldIndex)
            $this.mat.uniforms.effectFactor.value = intensity;
        else
            $this.mat.uniforms.effectFactor.value = intensity * -1;


        $this.mat.uniforms.texture1.value = $this.allImgs[oldIndex];
        $this.mat.uniforms.texture2.value = $this.allImgs[current];
        gsap.fromTo($this.mat.uniforms.dispFactor, speedIn, {value: 0}, {
            value: 1,
            ease: easing,
            onStart: resize,
            onUpdate: $this.animate,

        });
    };


    useEffect(() => {
        if (init.current)
            return;

        init.current = true;
        parent.current.classList.add("three-js-loader", "bg-three-js");

        $this.scene = new THREE.Scene();
        $this.width = window.innerWidth;
        $this.height = window.innerHeight;

        getRenderer()
            .then((renderer) => {
                $this.renderer = renderer;
                $this.renderer.setPixelRatio(window.devicePixelRatio);
                $this.renderer.setClearColor(0xffffff, 0.0);
                $this.renderer.setSize($this.width, $this.height);
                $this.width = parent.current.offsetWidth;
                $this.height = parent.current.offsetHeight;


                return $this.renderer;
            })
            .then(() => {
                $this.camera = new THREE.PerspectiveCamera(
                    70,
                    window.innerWidth / window.innerHeight,
                    0.001,
                    1000
                );
                $this.camera.position.set(0, 0, 2);
                return $this.camera;
            })
            .then(() => {
                $this.manager = new THREE.LoadingManager();
                return $this.manager;
            })
            .then(manager => {
                $this.loader = new THREE.TextureLoader(manager);
                $this.disp = $this.loader.load(displacement);
                $this.disp.wrapS = $this.disp.wrapT = THREE.RepeatWrapping;
                data.forEach((item: { poster: string, src: string }, x) => {
                    if (item.poster)
                        video(item.src, item.poster, x);
                    else
                        image(item.src, x);
                })

                return $this.allImgs;
            })
            .then(() => {

                $this.mat = new THREE.ShaderMaterial({
                    extensions: {
                        derivatives: "#extension GL_OES_standard_derivatives : enable"
                    },
                    side: THREE.DoubleSide,

                    uniforms: {
                        effectFactor: {type: "f", value: intensity},
                        dispFactor: {type: "f", value: 0},
                        texture1: {type: "t", value: $this.allImgs[0]},
                        texture2: {type: "t", value: $this.allImgs[0]},
                        disp: {type: "t", value: $this.disp},
                        resolution: {type: "v4", value: new THREE.Vector4()},
                    },
                    vertexShader: vertex,
                    fragmentShader: getFragment(direction),
                    transparent: true,
                    opacity: 1.0,
                });
                return $this.mat;
            })
            .then((mat) => {
                $this.geometry = new THREE.PlaneGeometry(1, 1, 2, 2);
                $this.plane = new THREE.Mesh($this.geometry, mat);
                return $this.plane;
            })
            .then((plane) => {
                $this.scene.add(plane);
            }).then(() => {
            const bgContainer = parent.current.querySelector('.bg-container');
            const swiper = bgContainer?.querySelector('.swiper').swiper;

            if (swiper) {
                effectSwiper.bind($this)({swiper, intensity, speedIn, easing});
                bgContainer.dataset.overlay = data[swiper.activeIndex]["overlay"] || "0";
                swiper.dsnOnChange = (activeIndex, oldIndex) => {
                    $this.changeTo(activeIndex, oldIndex);
                    bgContainer.dataset.overlay = data[activeIndex]["overlay"] || "0";
                }
            }
        })

            .then(() => {
                $this.animate = function () {
                    $this.renderer.render($this.scene, $this.camera);
                };


                const load = () => {
                    requestAnimationFrame(load);
                    if ($this.video)
                        $this.renderer.render($this.scene, $this.camera);
                }


                $this.manager.onLoad = () => {
                    parent.current.classList.remove("three-js-loader");


                    if ($this.destroyed) {
                        destroy();
                        return;
                    }


                    resize();
                    window.addEventListener("resize", resize);

                    onComplete && onComplete.bind($this)();

                };
            });


    }, []);// eslint-disable-line react-hooks/exhaustive-deps


    return <canvas ref={canvas}/>
}

export default memo(DsnWebgelDirction);
