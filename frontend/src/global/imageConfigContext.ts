import { createContext } from "react";
import type { ImageConfig } from "../utils/interfaces";


export const ImageConfigContext = createContext({
    imageConfig: {} as ImageConfig,
    setImageConfig: (config: ImageConfig) => {},
})