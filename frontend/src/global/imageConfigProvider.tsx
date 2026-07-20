import { useState } from "react";
import type { ImageConfig } from "../utils/interfaces";
import { ImageConfigContext } from "./imageConfigContext";


export function ImageConfigProvider({ children }: { children: React.ReactNode }) { 
    const [imageConfig, setImageConfig] = useState<ImageConfig>({} as ImageConfig);
    return (
        <ImageConfigContext.Provider value={{ imageConfig, setImageConfig }}>
            {children}
        </ImageConfigContext.Provider>
    )
}