import React, { useState } from "react";
import { View, Text, Pressable, SafeAreaView, Image, Modal, TextInput, FlatList } from "react-native";
import MainLayout from "../components/MainLayout";
import AddNewButton from "../components/AddNewButton";
import { Ionicons } from "@expo/vector-icons";
import "../global.css";

const COMPONENT_SLOTS = [
  { key: "motherboard", label: "MOTHERBOARD", placeholder: "Pick your motherboard..." },
  { key: "cpu", label: "CPU", placeholder: "Pick your CPU..." },
  { key: "gpu", label: "GPU", placeholder: "Pick your GPU..." },
  { key: "ram", label: "RAM", placeholder: "Pick your RAM..." },
  { key: "case", label: "CASE", placeholder: "Pick your case..." },
  { key: "storage", label: "STORAGE", placeholder: "Pick your storage..." },
  { key: "cooling", label: "COOLING", placeholder: "Pick your cooler..." },
  { key: "psu", label: "PSU", placeholder: "Pick your power supply..." },
];

const CPU_OPTIONS = [
  {
    id: "1",
    name: "Intel® Core™ i9-14900KF, 24 Cores & 32 Threads",
    price: "Rp 9.000.000 ~",
    image: require("../assets/images/intel_i9.jpg"),
    rating: 4.3,
    description: "The Intel Core i9-14900KF is a high-performance 24-core processor …",
  },
];

function Home() {
const [pcBuilds, setPcBuilds] = useState([]);
const [creating, setCreating] = useState(false);
const [selectedSlot, setSelectedSlot] = useState(null);
const [selectedComponent, setSelectedComponent] = useState(null);

const [selectedComponents, setSelectedComponents] = useState(
COMPONENT_SLOTS.reduce((acc, s) => ({ ...acc, [s.key]: null }), {})
);

  const [modalVisible, setModalVisible] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [buildDesc, setBuildDesc] = useState("");

const handleBack = () => {
    if (selectedComponent) setSelectedComponent(null);
    else if (selectedSlot) setSelectedSlot(null);
    else setCreating(false);
};

const handleDeleteBuild = (indexToDelete) => {
    setPcBuilds((prev) => prev.filter((_, i) => i !== indexToDelete));
};

const [actionModalVisible, setActionModalVisible] = useState(false);
const [selectedBuildIndex, setSelectedBuildIndex] = useState(null);

  const handleSaveBuild = () => {
    if (!buildName.trim()) return;
    setPcBuilds((prev) => [
      ...prev,
      { name: buildName, description: buildDesc }
    ]);
    setModalVisible(false);
    setBuildName("");
    setBuildDesc("");
    setCreating(false);
    setSelectedSlot(null);
    setSelectedComponent(null);
    setSelectedComponents(
      COMPONENT_SLOTS.reduce((acc, s) => ({ ...acc, [s.key]: null }), {})
    );
  };

  const renderSlot = (item) => {
    const chosen = selectedComponents[item.key];
    return (
      <Pressable
        key={item.key}
        onPress={() => { setSelectedSlot(item.key); setSelectedComponent(null); }}
        className="flex-row justify-between items-center bg-[#f8f2f9] rounded-xl p-[15px] mb-1.5"
      >
        <View className="flex-row items-center">
          <View className="bg-black w-9 h-9 rounded-md items-center justify-center">
            <Text className="text-white text-lg font-bold">{item.label[0]}</Text>
          </View>
          <View className="ml-2">
            <Text className="text-base font-black text-black">{item.label}</Text>
            <Text className="text-xs text-gray-700">{chosen ? chosen.name : item.placeholder}</Text>
          </View>
        </View>
        <Ionicons name="add-circle-outline" size={24} color="#000" />
      </Pressable>
    );
  };

  const renderCpuItem = ({ item }) => (
    <Pressable
      onPress={() => setSelectedComponent(item)}
      className="border border-gray-700 rounded-xl m-2 p-5 flex-row items-center justify-between"
    >
      <View className="flex-row items-center">
        <Image source={item.image} className="w-12 h-12 rounded-md" />
        <View className="ml-3 flex-1">
          <Text className="text-white text-sm font-bold">{item.name}</Text>
          <Text className="text-gray-300 text-xs mt-1">{item.price}</Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text className="ml-1 text-gray-300 text-xs">{item.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="add-circle-outline" size={20} color="#fff" className="right-6" />
    </Pressable>
  );

  const renderBuildCard = ({ item, index}) => (
    <View className="flex-row items-center bg-[#9fcfff] rounded-xl p-4 mx-4 my-2">
        <View className="flex-1">
            <Text className="text-lg font-bold mb-1">{item.name}</Text>
            <Text className="text-sm">{item.description}</Text>
        </View>
        <Pressable
            onPress={() => {
            setSelectedBuildIndex(index);
            setActionModalVisible(true);
            }}
        >
            <Ionicons name="chevron-forward" size={24} color="#000" />
        </Pressable>
    </View>
  );

  return (
    <MainLayout>
      <SafeAreaView className="flex-1">
        {creating ? (
          <>
            <View className="flex-row justify-between items-center p-4">
              <Text className="text-white text-lg font-bold mr-24">
                {selectedComponent
                  ? selectedComponent.name
                  : selectedSlot
                  ? `${selectedSlot.toUpperCase()} Selections:`
                  : "New PC Build:"}
              </Text>
              <Pressable onPress={handleBack}>
                <Ionicons name="arrow-back" size={28} color="#fff" />
              </Pressable>
            </View>

            {!selectedSlot && !selectedComponent && (
              <View className="flex-1 px-4">
                {COMPONENT_SLOTS.map(renderSlot)}
              </View>
            )}

            {selectedSlot === "cpu" && !selectedComponent && (
              <FlatList
              data={CPU_OPTIONS}
              renderItem={renderCpuItem}
              keyExtractor={(c) => c.id}
              />
            )}

            {selectedComponent && (
              <View className="m-4 p-4 border border-gray-600 rounded-xl">
                <Image source={selectedComponent.image} className="w-24 h-24 rounded mb-3" />
                <Text className="text-white text-base font-bold mb-2">{selectedComponent.name}</Text>
                <Text className="text-white text-sm mb-1">{selectedComponent.price}</Text>
                <View className="flex-row items-center mb-4">
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text className="ml-1 text-white text-xs">{selectedComponent.rating.toFixed(1)}</Text>
                </View>
                <Text className="text-white text-xs mb-4">{selectedComponent.description}</Text>

                <Pressable
                  onPress={() => {
                    setSelectedComponents(prev => ({
                      ...prev,
                      [selectedSlot]: selectedComponent
                    }));
                    setSelectedComponent(null);
                    setSelectedSlot(null);
                  }}
                  className="bg-[#9fcfff] rounded-full p-3 mb-3"
                >
                  <Text className="text-center font-bold text-black">Add to Build</Text>
                </Pressable>
                <Pressable onPress={() => setSelectedComponent(null)} className="bg-gray-700 rounded-full p-3">
                  <Text className="text-center font-bold text-white">Cancel</Text>
                </Pressable>
              </View>
            )}

            {!selectedSlot && !selectedComponent && (
              <Pressable onPress={() => setModalVisible(true)} className="self-center p-3">
                <Text className="text-[#ff3b30] text-base font-bold underline">Save Build</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text className="text-2xl font-bold text-white m-4">My PC Builds: </Text>
            <FlatList
            data={pcBuilds}
            renderItem={renderBuildCard}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={
                pcBuilds.length === 0
                  ? { flexGrow: 1, justifyContent: 'center', alignItems: 'center' }
                  : undefined
            }
            ListEmptyComponent={
            <Text className="text-center text-white text-base">
                No builds yet!
            </Text>
            }
            />
            <View className="absolute bottom-6 right-6">
              {!creating && <AddNewButton onPress={() => setCreating(true)} />}
            </View>
          </>
        )}
      </SafeAreaView>

    <Modal
    visible={modalVisible}
    transparent
    animationType="slide"
    onRequestClose={() => setModalVisible(false)}
    >
    <View className="flex-1 bg-black/50 justify-center items-center">
        <View className="bg-[#222] p-5 rounded-xl w-4/5">
        <Text className="text-white text-lg font-bold mb-3">Save Build</Text>
        <TextInput
        placeholder="Build Name"
        value={buildName}
        onChangeText={setBuildName}
        className="bg-[#333] text-white rounded p-2 mb-3"
        />
        <TextInput
        placeholder="Description"
        value={buildDesc}
        onChangeText={setBuildDesc}
        className="bg-[#333] text-white rounded p-2 mb-3 h-20"
        multiline
        />
        <Pressable onPress={handleSaveBuild} className="bg-[#9fcfff] rounded p-3 mb-2">
            <Text className="text-center font-bold text-black">Save</Text>
        </Pressable>
        <Pressable onPress={() => setModalVisible(false)} className="bg-gray-600 rounded p-3">
            <Text className="text-center font-bold text-white">Cancel</Text>
        </Pressable>
        </View>
    </View>
    </Modal>

    <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
    >
  <View className="flex-1 bg-black/50 justify-center items-center">
    <View className="bg-ymblue w-4/5 p-6 rounded-xl">
      <Text className="text-lg font-bold mb-4 text-center font-helvetica">Choose an action!</Text>

      <Pressable
        onPress={() => {
          // Placeholder for edit functionality
          setActionModalVisible(false);
          alert("Edit not implemented yet");
        }}
        className="bg-green-600 rounded-xl p-3 mb-3"
      >
        <Text className="text-center text-black font-bold font-helvetica">Edit</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          handleDeleteBuild(selectedBuildIndex);
          setActionModalVisible(false);
        }}
        className="bg-red-500 rounded-xl p-3"
      >
        <Text className="text-center text-black font-bold font-helvetica">Delete</Text>
      </Pressable>
    </View>
  </View>
</Modal>

    </MainLayout>
  );
}

export default Home;