import net from "net";
import dgram from "dgram";

const IP_ADDRESS = "192.168.1.203";
const PORT = 4370;

type ConnectionType = "TCP" | "UDP";
type DataEventType = "message" | "data";

class Connect {
  private ip: string;
  private port: number;
  private timeout: number;
  private connectionType: ConnectionType;
  private dataEvent: DataEventType;
  private socket: net.Socket | dgram.Socket;
  constructor({
    ip,
    port,
    timeout,
    connectionType,
  }: {
    ip: string;
    port?: number;
    timeout?: number;
    connectionType?: ConnectionType;
  }) {
    this.ip = ip;
    this.port = port || 4370;
    this.timeout = timeout || 3000;
    this.connectionType = connectionType || "TCP";
    this.dataEvent = this.connectionType === "UDP" ? "message" : "data";
  }

  private createUDPSocket(cb: (err?: any) => void) {
    const socket = dgram.createSocket("udp4");

    socket.once("error", (err) => {
      socket.close();

      cb(err);
    });

    socket.once("listening", () => {
      cb();
    });

    socket.bind(this.port);

    return socket;
  }
  private createTCPSocket(cb: (err?: any) => void) {
    const socket = new net.Socket();

    socket.once("error", (err) => {
      socket.end();

      cb(err);
    });

    socket.once("connect", () => {
      cb();
    });

    if (this.timeout) {
      socket.setTimeout(this.timeout);
    }

    socket.connect(this.port, this.ip);

    return socket;
  }

  createSocket(cb: (err?: any) => void) {
    this.socket =
      this.connectionType === "UDP"
        ? this.createUDPSocket(cb)
        : this.createTCPSocket(cb);
  }

  writeUdpSocket(socket, msg, offset, length, cb) {
    let sendTimeoutId;

    socket.once(this.DATA_EVENT, () => {
      sendTimeoutId && clearTimeout(sendTimeoutId);

      cb();
    });

    socket.send(msg, offset, length, this.port, this.ip, (err) => {
      if (err) {
        cb && cb(err);
        return;
      }

      if (this.timeout) {
        sendTimeoutId = setTimeout(() => {
          cb && cb(new Error("Timeout error"));
        }, this.timeout);
      }
    });
  }

  writeTcpSocket(socket, msg, offset, length, cb) {
    socket.once(this.DATA_EVENT, () => {
      socket.removeListener("timeout", handleOnTimeout);

      cb();
    });

    const handleOnTimeout = () => {
      cb && cb(new Error("Timeout error"));
    };

    socket.once("timeout", handleOnTimeout);

    socket.write(msg, null, (err) => {
      if (err) {
        cb && cb(err);
        return;
      }
    });
  }

  send(msg: string, offset, length, cb) {
    if (this.connectionType === "UDP") {
      this.writeUdpSocket(this.socket, msg, offset, length, cb);
    } else {
      this.writeTcpSocket(this.socket, msg, offset, length, cb);
    }
  }

  closeSocket() {
    if (this.socket instanceof dgram.Socket) {
      this.closeUDPSocket(this.socket);
    } else {
      this.closeTCPSocket(this.socket);
    }
  }

  private closeUDPSocket(socket: dgram.Socket) {
    socket.removeAllListeners("message");
    socket.close();
  }

  private closeTCPSocket(socket: net.Socket) {
    socket.removeAllListeners("data");
    socket.end();
  }
}

const socket = new net.Socket();

socket.once("error", (err) => {
  console.log("error");
  socket.end();
});

socket.once("connect", () => {
  console.log("connect");
});

socket.connect(PORT, IP_ADDRESS);
socket.once("data", () => {
  console.log("data");
});
// socket.write("asdasd", "utf-8", (err) => {
//   if (err) {
//     console.log("error");
//     return;
//   }
// });

// ------------------------ working ------------------

// const server = dgram.createSocket('udp4');

// const server = net.createServer((stream) => {
//   stream.on("connect", function () {
//     stream.write("hello\r\n");
//   });

//   stream.on("data", function (data) {
//     stream.write(data);
//   });

//   stream.on("end", function () {
//     stream.write("goodbye\r\n");
//     stream.end();
//   });
// });

// server.listen(PORT, IP_ADDRESS);

// const client = net.createConnection({ host: IP_ADDRESS, port: PORT });

// client.on("data", (data) => {
//   console.log("Received data from the device:", data);
//   client.destroy();
// });

// client.on("close", () => {
//   console.log("Connection closed");
// });

// client.on("error", (err) => {
//   console.error("Connection error:", err);
// });
