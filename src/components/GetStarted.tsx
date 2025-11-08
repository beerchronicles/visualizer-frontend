import {Button, Flex, NativeSelect} from "@chakra-ui/react";
import {type ReactNode, useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router";

export function GetStarted() {
    const [maps, setMaps] = useState([] as ReactNode[])
    const [isLoaded, setIsLoaded] = useState(false)
    const [value, setValue] = useState("")
    const navigate = useNavigate()

    useEffect(() => {
        if (!isLoaded) {
            setIsLoaded(true)

            fetch("http://localhost:8000/all_maps")
                .then(res => res.json())
                .then(res => {
                    setMaps(res.maps.map((x: number) => <option value={x} key={x}>{x}</option>))
                    setValue(res.maps[0] + '')
                })
        }
    }, [maps, isLoaded])

    return (
        <Flex justify="center" align="center" h="100vh" w="100vw">
            <Flex direction="column" gap="5px">
                <NativeSelect.Root>
                    <NativeSelect.Field
                        value={value}
                        onChange={(e) => setValue(e.currentTarget.value)}
                    >
                        {maps}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator/>
                </NativeSelect.Root>
                <Button onClick={useCallback(() => navigate(`/map/${value}`), [navigate, value])}>Выбрать существующую карту</Button>
                <Button onClick={useCallback(() => navigate('/create_map'), [navigate])}>Создать новую карту</Button>
            </Flex>
        </Flex>
    )
}