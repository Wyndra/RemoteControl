const noble = require('@abandonware/noble');

// 扫描并发现蓝牙设备的服务和特征 UUID
function discoverBluetoothDevices() {
    noble.on('stateChange', async (state) => {
        if (state === 'poweredOn') {
            console.log('开始扫描蓝牙设备...');
            noble.startScanning();
        } else {
            noble.stopScanning();
        }
    });

    noble.on('discover', async (peripheral) => {
        console.log(`发现蓝牙设备: ${peripheral.advertisement.localName} (${peripheral.address})`);
        noble.stopScanning();
        
        peripheral.connect((error) => {
            if (error) {
                console.error(`连接蓝牙设备失败: ${error.message}`);
                return;
            }
            console.log('成功连接蓝牙设备');
            peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
                if (error) {
                    console.error(`发现服务和特征失败: ${error.message}`);
                    return;
                }
                console.log('发现的服务:');
                services.forEach((service) => {
                    console.log(`- ${service.uuid}`);
                });
                console.log('发现的特征:');
                characteristics.forEach((characteristic) => {
                    console.log(`- ${characteristic.uuid}`);
                });
                peripheral.disconnect();
            });
        });
    });
}

discoverBluetoothDevices();
