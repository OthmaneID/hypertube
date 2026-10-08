import { useParams } from "react-router-dom";

function Watch() {
    const { hash } = useParams()
    hash;

    return (
        <div>
            <video src=""></video>
        </div>
    )
}



export default Watch;