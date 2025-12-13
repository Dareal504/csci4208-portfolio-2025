
export async function syncUp(localAdapter, cloudAdapter) {
    const localDoc = await localAdapter.load();
    await cloudAdapter.save(localDoc);
    return true;
  }
  
  export async function syncDown(localAdapter, cloudAdapter) {
    const cloudDoc = await cloudAdapter.load();
    await localAdapter.save(cloudDoc);
    return true;
  }
  