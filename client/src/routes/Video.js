import React, { useEffect, useRef, useState } from "react";
import Paper from '@mui/material/Paper';

const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    }, []);

    return (
        <Paper elevation={3} style={{ textAlign: "center" }}>
            <div  style={{ width: "100%", padding: "5px" }}>
               {props.name}
            </div>
            <video style={{ width: "100%" }} playsInline autoPlay ref={ref} />
        </Paper>
    );
}

export default Video