import {Button, FileUpload, Flex, Input} from "@chakra-ui/react";
import {useCallback, useState} from "react";
import {useNavigate} from "react-router";

export function CreateMap() {
    const [lbx, setLbx] = useState(58)
    const [lby, setLby] = useState(56)
    const [pointFile, setPointFile] = useState(null as Blob | null)
    const [cadastreFile, setCadastreFile] = useState(null as Blob | null)
    const [showLoading, setShowLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = useCallback(() => {
        setShowLoading(true)

        try {
            fetch(`http://localhost:8000/new_map?lbx=${lbx}&lby=${lby}`, {
                method: 'POST'
            })
                .then(res => res.json())
                .then(async res => {
                    const pointFormData = new FormData()
                    const cadastreFormData = new FormData()

                    pointFormData.append('file', pointFile!)
                    cadastreFormData.append('file', cadastreFile!)

                    await fetch(`http://localhost:8000/upload_point?map_id=${res.map_id}`, {
                        method: 'POST',
                        body: pointFormData
                    })

                    await fetch(`http://localhost:8000/upload_cadastre?map_id=${res.map_id}`, {
                        method: 'POST',
                        body: cadastreFormData
                    })

                    await fetch(`http://localhost:8000/process?map_id=${res.map_id}`)

                    const timestamps = (await fetch(`http://localhost:8000/available_timestamps?map_id=${res.map_id}`).then(res => res.json())).timestamps

                    navigate(`/map/${res.map_id}/${timestamps[0]}`)
                })
        } catch {
            setShowLoading(false)
        }
    }, [lbx, lby, pointFile, cadastreFile, navigate])

    return (
        <Flex justify="center" align="center" h="100vh" w="100vw">
            <form style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
            }}>
                {
                    showLoading ?
                        <p>Идёт загрузка карты (это может быть долго, не закрывайте страницу)...</p> :
                        <></>
                }
                <Input placeholder="X левого нижнего угла в системе WGS84"
                       value={lbx}
                       onChange={e => setLbx(+e.currentTarget.value)}
                       name="lby"
                       required
                >
                </Input>
                <Input placeholder="Y левого нижнего угла в системе WGS84"
                       value={lby}
                       onChange={e => setLby(+e.currentTarget.value)}
                       name="lbx"
                       required
                >
                </Input>
                <FileUpload.Root
                    onFileAccept={({files}) => setPointFile(files[0])}
                    onFileReject={() => setPointFile(null)}
                >
                    <FileUpload.HiddenInput name="point_csv"/>
                    <FileUpload.Trigger asChild>
                        <Button variant="outline" size="sm">
                            Загрузить точечные источники (point.csv)
                        </Button>
                    </FileUpload.Trigger>
                    <FileUpload.List/>
                </FileUpload.Root>
                <FileUpload.Root
                    onFileAccept={({files}) => setCadastreFile(files[0])}
                    onFileReject={() => setCadastreFile(null)}
                >
                    <FileUpload.HiddenInput name="cadastre_csv"/>
                    <FileUpload.Trigger asChild>
                        <Button variant="outline" size="sm">
                            Загрузить областные источники (cadastre.csv)
                        </Button>
                    </FileUpload.Trigger>
                    <FileUpload.List/>
                </FileUpload.Root>
                <Button onClick={handleSubmit}>Создать</Button>
            </form>
        </Flex>
    )
}