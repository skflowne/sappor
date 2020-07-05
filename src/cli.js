import arg from "arg"
import inquirer from "inquirer"
import fs from "fs"
import path from "path"
import chalk from "chalk"

import execa from "execa"
import { exec} from "child_process"
import listr from "listr"

import tools from "./tools"

function parseArguments(rawArgs) {
    const args = arg(
        {
            "--bundler": String,
            "--ssr": Boolean,
            "--css": String,
            "--ui": String,
            "--force": Boolean,
        },
        {
            "-b": "--bundler",
            "-s": "-ssr",
            "-c": "--css",
            "-u": "--ui",
            "-f": "--force"
        }
    )

    return {
        bundler: args["--bundler"],
        ssr: args["--ssr"],
        css: args["--css"],
        ui: args["--ui"],
        appName: args["_"][0],
        overwrite: args["--force"] || false,
    }
}

async function promptOptions(options) {
    let questions = []

    if (!options.appName) {
        questions.push({
            name: "appName",
            message: "Enter a name for your app",
            type: "input",
            validate: (name) => {
                if (name.length === 0) {
                    return "App name cannot be blank"
                }
                return true
            },
        })
    }

    if (!options.bundler) {
        questions.push({
            name: "bundler",
            message: "Choose bundler",
            type: "list",
            default: tools.ROLLUP,
            choices: [
                { name: "Rollup", value: tools.ROLLUP },
                { name: "Webpack", value: tools.WEBPACK },
            ],
        })
    }

    if (options.ssr === undefined) {
        questions.push({
            name: "ssr",
            message: "Would you like to use SSR (Sapper) ?",
            default: false,
            type: "confirm",
        })
    }

    if (!options.css) {
        questions.push({
            name: "css",
            message: "Choose CSS preprocessor",
            type: "list",
            default: null,
            choices: [
                { name: "None", value: null },
                { name: "SCSS", value: tools.SCSS },
            ],
        })
    }

    if (!options.ui) {
        questions.push({
            name: "ui",
            message: "Choose UI framework",
            type: "list",
            default: null,
            choices: [
                { name: "None", value: null },
                { name: "TailwindCSS", value: tools.TAILWIND },
            ],
        })
    }

    try {
        const answers = await inquirer.prompt(questions)

        return {
            ...options,
            ...answers,
            ssr: answers.ssr ? tools.SAPPER : tools.SVELTE,
        }
    } catch (e) {
        console.error("ERROR", e)
    }
}

export async function cli(args) {
    let options = parseArguments(args)

    options = await promptOptions(options)

    console.log("options", options)

    const { ssr, appName, css, ui, bundler } = options

    const appPath = path.resolve(__dirname, appName)

    const templates = {
        SVELTE_ROLLUP: "sveltejs/template",
        SVELTE_WEBPACK: "sveltejs/template-webpack",
        SAPPER_ROLLUP: "sveltejs/sapper-template#rollup",
        SAPPER_WEBPACK: "sveltejs/sapper-template#webpack",
    }

    const tasks = new listr([
        {
            title: `Degit for ${ssr} with ${bundler}`,
            task: () =>
                new listr([
                    {
                        title: "Create app directory",
                        task: () => {
                                fs.mkdirSync(appName, { recursive: true })
                        },
                    },
                    {
                        title: "Copy files",
                        task: () => {
                            exec(`npx degit ${templates[`${ssr}_${bundler}`]} ${appName} ${options.overwrite ? '--force': ''}`, null, (err, stdout) => {
                                console.log('err', err, 'out', stdout)
                            })
                        },
                    },
                ]),
        },
    ])

    tasks.run().catch((e) => {
        console.log(chalk.bold.red("ERROR"), e)
    })
}
