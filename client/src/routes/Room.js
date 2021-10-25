import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import streamSaver from "streamsaver";
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Video from "./Video";
// import AppBar from "../components/common/AppBar"
import Button from '@mui/material/Button';
// import Popup from "../components/common/Popup";

const worker = new Worker("../worker.js");

const config = { host: 'localhost', port: 8000, path: '/peerjs' }

const Input = styled('input')({
    display: 'none',
});

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    const [gotFile, setGotFile] = useState(false)
    const [file, setFile] = useState();
    const [selectedUsers, setSelectedUsers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const shareStreamRef = useRef();
    const fileNameRef = useRef("");
    const roomID = props.match.params.roomID;

    useEffect(() => {
        socketRef.current = io.connect("/");
        navigator.getUserMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.moxGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);

        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            }).then(stream => createConnection(stream)).catch(err => console.log(err));
        } else {
            navigator.getUserMedia({
                video: true,
                audio: false
            }, stream => createConnection(stream), err => console.log(err));
        }
    }, []);

    function createConnection(stream) {
        userVideo.current.srcObject = stream;
        socketRef.current.emit("join room", roomID);
        socketRef.current.on("all users", users => {
            const peers = [];
            users.forEach(userID => {
                const peer = createPeer(userID, socketRef.current.id, stream);
                peersRef.current.push({
                    peerID: userID,
                    peer,
                })
                peers.push({
                    peerID: userID,
                    peer,
                });
            })
            setPeers(peers);
        })

        socketRef.current.on("user joined", payload => {
            const peer = addPeer(payload.signal, payload.callerID, stream);
            peersRef.current.push({
                peerID: payload.callerID,
                peer,
            })
            const peerObj = { peer, peerID: payload.callerID }
            setPeers(users => {
                const userList = [...users, peerObj];
                return checkDuplicate(userList);
            });
            if (shareStreamRef.current) {
                handleShareScreen(shareStreamRef.current);
            }
        });

        socketRef.current.on("receiving returned signal", payload => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            item.peer.signal(payload.signal);
        });

        socketRef.current.on("user_disconnect", id => {
            const peerObj = peersRef.current.find(it => it.peerID === id);
            if (peerObj) {
                peerObj.peer.destroy()
            }
            const peers = peersRef.current.filter(it => it.peerID !== id);
            peersRef.current = peers;
            setPeers(peers);
        })
    }

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            config,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        peer.on("data", handleReceivingData);

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            config,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.on("data", handleReceivingData);

        peer.signal(incomingSignal);

        return peer;
    }

    function checkDuplicate(arr) {
        var temp = arr.filter((peerIt, index) => {
            return arr.findIndex(peerI => peerI.peerID === peerIt.peerID) === index;
        })
        return temp
    }

    function handleClickShare() {
        navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always"
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }
        }).then(stream => {
            let videoTrack = stream.getVideoTracks()[0];
            shareStreamRef.current = stream.getVideoTracks()[0];
            videoTrack.onended = function () {
                handleShareScreen(userVideo.current.srcObject.getTracks()[0])
            }
            handleShareScreen(videoTrack);
        })
    }

    function handleShareScreen(newTrack) {
        peersRef.current.forEach(p => {
            let track = p.peer.streams[0].getTracks().find(s => s.kind === 'video');
            p.peer.replaceTrack(track, newTrack, userVideo.current.srcObject)
        })
    }

    function handleReceivingData(data) {
        if (data.toString().includes("done")) {
            setGotFile(true);
            const parsed = JSON.parse(data);
            fileNameRef.current = parsed.fileName;
        } else {
            worker.postMessage(data);
        }
    }

    function download() {
        setGotFile(false);
        worker.postMessage("download");
        worker.addEventListener("message", event => {
            const stream = event.data.stream();
            const fileStream = streamSaver.createWriteStream(fileNameRef.current);
            stream.pipeTo(fileStream);
        })
    }

    function selectFile(e) {
        setFile(e.target.files[0]);
    }

    function sendFile() {
        if (selectedUsers.length <= 0) {
            alert("Please choose at least person")
        }
        selectedUsers.forEach(user => {
            const peer = peersRef.current.find(p => p.peerID === user).peer;
            const stream = file.stream();
            const reader = stream.getReader();

            reader.read().then(obj => {
                handleReading(obj.done, obj.value);
            });

            function handleReading(done, value) {
                if (done) {
                    peer.write(JSON.stringify({ done: true, fileName: file.name }));
                    return;
                }

                peer.write(value);
                reader.read().then(obj => {
                    handleReading(obj.done, obj.value);
                })
            }
        })
        setSelectedUsers([])
    }

    function cancel() {
        setGotFile(false)
    }

    let downloadPrompt;
    if (gotFile) {
        downloadPrompt = (
            <div>
                <span>You have received a file. Would you like to download the file?</span>
                <button onClick={download}>Yes</button>
                <button onClick={cancel}>No</button>
            </div>
        );
    }

    function handleChooseUser(id) {
        if (!selectedUsers.includes(id)) {
            setSelectedUsers(user => [...user, id])
        } else {
            const temp = selectedUsers.filter(it => it !== id);
            setSelectedUsers(temp)
        }
    }

    return (
        <div>
            {/* <AppBar /> */}
            <Grid container sx={{ flexFlow: 1 }}>
                <Grid item xs={2} direction="column"
                    alignItems="center"
                    justifyContent="center"
                    style={{ minHeight: '100vh' }}
                >
                    <Grid item xs={12}>
                        <Grid item xs={12}>
                            <Grid container sx={{ flexFlow: 1 }} justifyContent="center">
                                <Grid item xs={12} style={{ textAlign: "center" }}>
                                    <h3>Online Users</h3>
                                </Grid>
                                {peers.map((peer) => {
                                    return (
                                        <Grid item xs={10} key={peer.peerID} onClick={e => handleChooseUser(peer.peerID)}>
                                            <Video key={peer.peerID} peer={peer.peer} name={peer.peerID} />
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item xs={7} style={{ minHeight: '100vh', background: "linear-gradient(#1e5fc7, #db9cd0)" }}>
                    <Grid item xs={12}>
                        <Grid container sx={{ flexFlow: 1 }} >
                            <Grid item xs={12} style={{ textAlign: "center" }}>
                                <h3>Main User</h3>
                            </Grid>
                            <Grid item xs={12} style={{ textAlign: "center" }}>
                                <video muted ref={userVideo} autoPlay playsInline style={{ width: "80%" }} />
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item xs={12} style={{ textAlign: "center" }}>
                        <Grid container sx={{ flexFlow: 1 }} >
                            <Grid item xs={3}>
                                <Button onClick={handleClickShare} color="success" variant="contained">Share Screen</Button>
                            </Grid>
                            <Grid item xs={9}>
                                <Grid container sx={{ flexFlow: 1 }} >
                                    <Grid item xs={8} />
                                    <Grid item xs={2}>
                                        <label htmlFor="contained-button-file">
                                            <Input accept="*" id="contained-button-file" multiple type="file" onChange={selectFile} />
                                            <Button variant="contained" component="span" color="success">
                                                Choose
                                            </Button>
                                        </label>
                                    </Grid>
                                    <Grid item xs={2}>
                                        <Button onClick={sendFile} color="success" variant="contained">Send</Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                    {downloadPrompt}
                    <div>
                        <ul>
                            {selectedUsers.map(it => {
                                return (
                                    <li key={it}>{it}</li>
                                )
                            })}
                        </ul>
                    </div>
                </Grid>
                <Grid item xs={3}></Grid>
            </Grid>
        </div>
    );
};

export default Room;
