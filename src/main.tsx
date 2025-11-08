import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.tsx'
import {BrowserRouter, Route, Routes} from "react-router";
import {CreateMap} from "./components/CreateMap.tsx";
import {ChakraProvider, defaultSystem} from "@chakra-ui/react";
import {MapView} from "./components/MapView.tsx";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ChakraProvider value={defaultSystem}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<App/>}></Route>
                    <Route path="/map/:mapId/:timestamp" element={<MapView />}></Route>
                    <Route path="/create_map" element={<CreateMap/>}></Route>
                </Routes>
            </BrowserRouter>
        </ChakraProvider>
    </StrictMode>,
)
